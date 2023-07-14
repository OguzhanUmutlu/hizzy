// noinspection JSUnusedGlobalSymbols,ExceptionCaughtLocallyJS,JSPotentiallyInvalidConstructorUsage

const fs = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");
const mime = require("mime");
const os = require("os");
const {exec} = require("child_process");
const {stdin} = process;
const {EventEmitter} = require("events");
const WS = require("ws");
const open = require("open");
const babel = require("@babel/core");
const babelParser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const minify = {
    js: (...r) => require("uglify-js").minify(...r).code,
    css: (...r) => require("csso").minify(...r).css,
    html: (...r) => require("html-minifier-terser").minify(...r)
};
const xss = require("xss");
const url = require("url");
const exit = (...msg) => {
    printer.dev.error(...msg);
    process.exit(1);
};
process.on("exit", () => {
    if (global.Hizzy) {
        const addons = Hizzy.getAddons();
        for (const i in addons) addons[i].module.disable("termination");
    }
});
process.on("SIGINT", () => {
    process.exit(0);
});
process.on("uncaughtException", error => {
    printer.dev.error(error);
    process.exit(1);
});

// todo: maybe split static into two, static and dynamic. static = cached, dynamic = not cached
// todo: use esbuild
// todo: add a production config to readme.md
// todo: a good explanation about packets in docs
// todo: compile the react element stuff in backend on startup, edit: i don't think this is possible anymore, maybe it is idk, edit: i think it is, edit: it is
// todo: add a function that gets all client functions of a file
// todo: IMPORTANT: it should update when css updates
// todo: a playground in the web page, update: idk if i will do this, this requires a sandbox server, i might use something like repl.it or glitch.com
// todo: cache file contents for the production mode

const random = () => crypto.getRandomValues(new Uint32Array([0]))[0].toString(36); // maybe get back to BigUint64?
const runtimeId = random();
const EVERYONE = f => {
    if (!f["__FUNCTION__"]) throw new Error("EVERYONE function only allows client-sided functions!");
    return async (...a) => {
        const res = {};
        for (const uuid of Hizzy.clientUUIDs()) {
            res[uuid] = await Hizzy.sendEvalTo(uuid, "__hizzy_run" + Hizzy.getHash(uuid) + "__[" + f["__FUNCTION__FILE_J__"] + "].normal." + f["__FUNCTION__"] + "(" + a.map(k => JSON.stringify(k)).join(",") + ")");
        }
        return res;
    };
};
Object.defineProperty(Function.prototype, "everyone", {
    get: function () {
        return EVERYONE(this);
    }
});
const makeClientFunction = (file, name, uuid = null) => {
    file = path.join(file);
    const fJ = JSON.stringify(file);
    const f = async (...a) => {
        if (uuid === null) throw new Error("This client-sided function wasn't assigned to any clients! Although you can still use the function with the '.everyone' property of this function!");
        const hash = Hizzy.getHash(uuid);
        return await Hizzy.sendEvalTo(uuid, `__hizzy_run${hash}__[${fJ}].normal.${name}(${a.map(k => JSON.stringify(k)).join(",")})`);
    };
    f.__FUNCTION__ = name;
    f.__FUNCTION__FILE__ = file;
    f.__FUNCTION__FILE_J__ = fJ;
    // f.everyone = EVERYONE(f);
    return f;
};
const makeBeginCode = (uuid, clientFunctions, fJ) => clientFunctions.map(i => `const ${i} = Hizzy.makeClientFunction(${fJ}, ${JSON.stringify(i)}, ${JSON.stringify(uuid)});`).join("");

const {CLIENT2SERVER, SERVER2CLIENT} = {
    CLIENT2SERVER: {
        HANDSHAKE_RESPONSE: "0", // agreed on shaking the hand
        CLIENT_FUNCTION_RESPONSE: "1", // the response got from running a client-sided function
        SERVER_FUNCTION_REQUEST: "2", // requested to run a function with the @server decorator
        KEEPALIVE: "3", // keep alive packet
        "0": "HANDSHAKE_RESPONSE",
        "1": "SERVER_FUNCTION_REQUEST",
        "2": "CLIENT_FUNCTION_RESPONSE",
        "3": "KEEPALIVE"
    },
    SERVER2CLIENT: {
        FILE_REFRESH: "0", // requests to refresh the page, so it can load the new contents
        HANDSHAKE_REQUESTED: "1", // requests handshake
        CLIENT_FUNCTION_REQUEST: "2", // requested to run a client-sided function
        SERVER_FUNCTION_RESPONSE: "3", // the response got from running a function with the @server decorator
        SURE_HANDSHAKE: "4", // server agreed on shaking the hand as well, what a friendship!
        "0": "FILE_REFRESH",
        "1": "HANDSHAKE_REQUESTED",
        "2": "CLIENT_FUNCTION_REQUEST",
        "3": "SERVER_FUNCTION_RESPONSE",
        "4": "SURE_HANDSHAKE"
    }
};
const fx = (a, b) => {
    a = a.toString();
    const spl = a.split(".");
    let d = spl[1] || "";
    if (d.length > b) d = d.substring(0, b);
    return spl[0] + (d ? "." + d : "");
};
const timeForm = ms => {
    if (ms >= 24 * 60 * 60 * 1000) return fx(ms / 24 / 60 / 60 / 1000, 3) + "d";
    if (ms >= 60 * 60 * 1000) return fx(ms / 60 / 60 / 1000, 3) + "h";
    if (ms >= 60 * 1000) return fx(ms / 60 / 1000, 3) + "m";
    if (ms >= 1000) return fx(ms / 1000, 3) + "s";
    return ms + "ms";
};

const ck = "__" + __PRODUCT__ + "__";
const jsOpt = {
    mangle: {toplevel: false}
};
const HIZZY_EXPERIMENTAL = process.argv.includes("--experimental");
let experimentalId = Date.now().toString(36);
let jsxInjection, htmlInjection, preactCode, preactHooksCode;
if (HIZZY_EXPERIMENTAL) {
    const t = Date.now();
    jsxInjection = minify.js(fs.readFileSync(path.join(__dirname, "injections/jsx.js"), "utf8"), jsOpt);
    fs.writeFileSync(path.join(__dirname, "injections/jsx.min.js"), jsxInjection);
    htmlInjection = minify.js(fs.readFileSync(path.join(__dirname, "injections/html.js"), "utf8")
        .replace("$CKL", ck.length + 1 + "")
        .replaceAll("$CK", ck), jsOpt);
    fs.writeFileSync(path.join(__dirname, "injections/html.min.js"), htmlInjection);
    (async () => {
        preactCode = (await (await fetch("https://esm.sh/stable/preact/es2022/preact.mjs")).text())
            .replace("sourceMappingURL", "");
        fs.writeFileSync(path.join(__dirname, "injections/preact.min.js"), preactCode); // todo: update 2022 to 2023(or 2024) when needed
        preactHooksCode = (await (await fetch("https://esm.sh/stable/preact/es2022/hooks.js")).text())
                .replace("sourceMappingURL", "")
                .replace(/"\/stable\/preact@(\d.?)+\/es2022\/preact\.mjs"/, `"./__hizzy__preact__?${experimentalId}"`) +
            `\nimport *as React from "./__hizzy__preact__?${experimentalId}"; export{React}`;
        fs.writeFileSync(path.join(__dirname, "injections/hooks.min.js"), preactHooksCode);
        fs.writeFileSync(path.join(__dirname, "injections/.last"), experimentalId);
        const sT = Date.now() - t;
        printer.dev.pass("Experimental initialization. (%c" + timeForm(sT) + "&t)", "color: orange");
    })();
} else {
    jsxInjection = fs.readFileSync(path.join(__dirname, "injections/jsx.min.js"), "utf8");
    htmlInjection = fs.readFileSync(path.join(__dirname, "injections/html.min.js"), "utf8");
    preactCode = fs.readFileSync(path.join(__dirname, "injections/preact.min.js"), "utf8");
    preactHooksCode = fs.readFileSync(path.join(__dirname, "injections/hooks.min.js"), "utf8");
    experimentalId = fs.readFileSync(path.join(__dirname, "injections/.last"), "utf8");
}

const interfaces = os.networkInterfaces();
const addresses = [];
for (const interfaceName in interfaces) {
    const iface = interfaces[interfaceName];
    for (const alias of iface) if (alias.family === "IPv4" && !alias.internal) addresses.push(alias.address);
}

class Client {
    static clients = {};
    __socket;
    class = Client;
    attributes = {};
    routes = {};

    constructor(socket) {
        if (Client.clients[socket._uuid]) return Client.clients[socket._uuid];
        this.__socket = socket;
        Client.clients[socket._uuid] = this;
    };

    get uuid() {
        return this.__socket._uuid;
    };

    async eval(code) {
        return await API.API.sendEvalTo(this.uuid, code);
    };

    remove(reason = "forced") {
        this.__socket._close(reason);
    };

    run(file, name, ...args) {
        return makeClientFunction(file, name, this.uuid)(...args);
    };
}

class Addon {
    static addons = {};
    #name;
    #options;
    #module;
    #init = false;

    static async create(name, options) {
        const p = new Addon(name, options);
        await p.init();
        return p;
    };

    constructor(name, options) {
        if (Addon.addons[name]) return Addon.addons[name];
        Addon.addons[name] = this;
        this.#name = name;
        this.#options = options;
    };

    async init() {
        const t = Date.now();
        let {name} = this;
        if (this.#init) return;
        this.#init = true;
        let pkgPath = path.join(name, "package.json");
        if (name.startsWith("@hizzy/")) {
            name = path.join(__dirname, "addons", name.substring(7)); // todo: move all of these into a new npm registry, not built-in
            pkgPath = path.join(name, "package.json");
            name = url.pathToFileURL(name).href;
        }
        try {
            if (!fs.existsSync(pkgPath) || !fs.statSync(pkgPath).isFile()) throw new Error("package.json file not found.");
            const cont = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
            this.#module = new (await import(name + path.sep + cont.main)).default(cont, this.#options);
        } catch (e) {
            printer.dev.fail("Failed to require addon: %c" + this.name + "&t, disabling it...", "color: orange");
            printer.dev.error(e);
            return;
        }
        if (typeof this.#module.onLoad === "function") this.#module.onLoad();
        const dt = Date.now() - t;
        printer.dev.pass("Loaded addon: %c" + this.#module.name + "@" + this.#module.version + " &t(%c" + timeForm(dt) + "&t)", "color: blue", "color: orange");
    };

    get options() {
        return this.#options;
    };

    get name() {
        return this.#name;
    };

    get module() {
        return this.#module;
    };
}

class AddonModule {
    #pkg;
    #options;

    constructor(pkg, options) {
        this.#pkg = pkg;
        this.#options = options;
    };

    get name() {
        return this.#pkg.name;
    };

    get description() {
        return this.#pkg.description;
    };

    get version() {
        return this.#pkg.version;
    };

    get options() {
        return this.#options;
    };

    onLoad() {
    };

    onEnable() {
    };

    onDisable(reason) {
    };

    onClientSideLoad = "";

    onClientSideRendered = "";

    onClientSideError = "";

    disable(reason) {
        printer.dev[reason ? "fail" : "debug"]("Disabling addon %c" + this.name + "&t" + (reason ? " for " + reason : "") + "...", "color: orange");
        this.onDisable();
    };

    log(...s) {
        printer.dev.log("[" + this.constructor.name + "] ", ...s);
    };
}

class API extends EventEmitter {
    /*** @type {API | null} */
    static API = null;
    Addon = Addon;
    Client = Client;
    AddonModule = AddonModule;
    #listening = false;
    #realtime = false;
    #isBuilding = false;
    #isScanningBuild = false;
    #dir;
    #buildCache = null;
    #blurCache = null;
    #buildPromise = new Promise(r => r());
    #builtAt = null;
    #buildRuntimeId = null;
    #scanPromise = new Promise(r => r());
    #webUUIDs = {};
    #clients = {};
    #jsxCache = {};
    #jsxFunctions = {};
    #port = -1;
    #https = conf.https;
    #serverAddress;
    #evalId = 0;
    #evalResponses = {};
    #isInputOn = false;
    #hashes = {};
    #initFunctions = [];
    #importMap = {};
    #importMains = {};
    #watchingFiles = {};
    #isInit = false;
    #uuidTimeout = {};
    #builtJSXCache = {};
    #builtJSXPage = {};
    #clientPages = {};
    #firstBuild = true;
    #firstScan = true;
    #addonCache = null;
    server;
    socketServer;
    autoRefresh = false;
    dev = false;
    customShortcuts = {};
    preRequests = [];

    constructor(dir) {
        if (API.API) return API.API;
        super();
        API.API = this;
        this.#dir = dir;
        const app = this.app = require("express")();
        app.disable("x-powered-by");
        this.server = (this.#https ? https : http).createServer(app);
    };

    async init() {
        if (this.#isInit) return;
        this.#isInit = true;
        this.app.use(async (req, res, next) => {
            // if (!req.headers.referer) return res.send("Made with Hizzy!");
            res.setHeader("X-Powered-By", "Hizzy");
            const uuid = this.getCookie(req.headers.cookie, ck);
            const socket = this.#clients[uuid];
            printer.dev.debug("request: " + req.url + ", method: " + req.method + ", ip: " + (req.ip.startsWith("::ffff:") ? req.ip.substring(7) : req.ip));
            if (!this.dev && (this.#isBuilding || this.#isScanningBuild)) return res.send("Building, please be patient.<script>setTimeout(_=>location.reload(),1000)</script>");
            let l = req.url.split("?")[0];
            if (l[0] !== "/") return;
            l = l.substring(1);
            req.__socket = socket;
            req._uuid = uuid;
            if (socket) socket._req = req;
            if (socket && l === `__${__PRODUCT__}__addons__`) {
                const run = req.url.split("?")[1];
                if (run !== runtimeId) return res.redirect("/__" + __PRODUCT__ + "__addons__?" + runtimeId);
                //res.setHeader("Cache-Control", "max-age=31536000,immutable");
                this.sendRawFile(".json", this.#addonCache, res);
                return;
            }
            if (socket && l.includes("/") && l.split("/")[0] === `__${__PRODUCT__}__import__`) {
                res.setHeader("Cache-Control", "max-age=31536000,immutable");
                const name = l.split("/")[1];
                if (!name) return;
                const err = [];
                this.#addImport(name, null, err);
                if (err.length) return res.json({error: "Module not found: " + err.join(", ")});
                if (!this.#importMap[name]) return;
                const rest = l.split("/").slice(2).join("/") || this.#importMains[name];
                const content = this.#importMap[name][rest];
                if (!content) return;
                this.sendRawFile(rest, content, res);
                return;
            }
            if (socket && l === "__" + __PRODUCT__ + "__preact__") {
                const run = req.url.split("?")[1];
                if (run !== experimentalId) return;
                //res.setHeader("Cache-Control", "max-age=31536000,immutable");
                this.sendRawFile(".js", preactCode, res);
                return;
            }
            if (socket && l === "__" + __PRODUCT__ + "__preact__hooks__") {
                const run = req.url.split("?")[1];
                if (run !== experimentalId) return;
                //res.setHeader("Cache-Control", "max-age=31536000,immutable");
                this.sendRawFile(".js", preactHooksCode, res);
                return;
            }
            const r = i => {
                if (i === this.preRequests.length) return next();
                this.preRequests[r](req, res, () => r(i + 1));
            };
            await r(0);
        });
        if (this.dev && !fs.existsSync(path.join(this.#dir, conf.srcFolder))) {
            printer.dev.warn("No %c/" + conf.srcFolder + "&t found. Forcing to disable the developer mode.", "color: orange");
            this.dev = false;
        }
    };

    findOptimalFile(file) {
        return fs.existsSync(file) ? file : null;
    };

    cacheDevFile(file) {
        return fs.readFileSync(file);
    };

    async cacheBuildFile(file) {
        if (!this.#buildCache) {
            await this.#scanPromise;
            await this.scanBuild();
        }
        return this.#buildCache[file];
    };

    async notFound(req, res) {
        if (!res.headersSent) res.send(`<pre>Not found: ${xss.filterXSS(req.url)}</pre>`);
    };

    prepLoad(req, res) {
        req._uuid = res._uuid = crypto.randomUUID();
        this.#webUUIDs[req._uuid] = req._Route;
        res.cookie(ck, res._uuid);
        if (conf.connectionTimeout > 0 && this.#realtime) this.#uuidTimeout[req._uuid] = setTimeout(() => {
            delete this.#webUUIDs[req._uuid];
        }, conf.connectionTimeout);
    };

    random() {
        return random();
    };

    enableRealtime() {
        if (this.#realtime) return;
        this.#realtime = true;
        const server_ = this.socketServer = new WS.WebSocketServer({server: this.server});
        server_.on("connection", (socket, req) => {
            const uuid = this.getCookie(req.headers.cookie, ck);
            socket._uuid = uuid;
            let beginCode = {}; // note: begin code is server-sided
            socket._handshook = false;
            socket._closed = false;
            socket._req = req;
            socket._actualReq = req;

            const o = this.#clientPages[uuid] || [];
            socket._clientPages = o[0];
            socket._mainFile = o[1];
            socket._URL_ = this.#webUUIDs[uuid];

            const isJSX = !!o[0];

            delete this.#clientPages[uuid];
            const client = new Client(socket);
            socket._send = s => {
                if (_argv_["debug-socket"]) printer.dev.debug("> " + s);
                if (!socket._closed) socket.send(s);
            };
            clearTimeout(this.#uuidTimeout[uuid]);
            const close = socket._close = (reason, t = true) => {
                clearTimeout(timeout);
                clearTimeout(keepalive);
                if (socket._closed) return;
                if (socket._handshook && isJSX) if (socket._mainFile) {
                    const jsx = socket._clientPages[socket._mainFile].json;
                    const leaveEvents = jsx.leaveEvent;
                    try {
                        Function("currentUUID", "currentClient", `${beginCode[socket._mainFile]};${leaveEvents.map(i => i.code).join(";")};${leaveEvents.map(i => `${i.name}()`).join(";")}`)(uuid, client);
                    } catch (e) {
                        printer.dev.error(e);
                    }
                }
                if (t) {
                    socket.close();
                    printer.dev.debug("socket remove: " + (socket._uuid || "-1") + ", " + reason);
                }
                socket._closed = true;
                delete this.#clients[uuid];
                if (Client.clients[uuid]) delete Client.clients[uuid];
            };
            let keepalive;
            let keepaliveStart;
            const ka = () => {
                if (conf.keepaliveTimeout < 0 || !(socket._URL_.endsWith(".jsx") || socket._URL_.endsWith(".tsx"))) return;
                if (!keepaliveStart || keepaliveStart + conf.minClientKeepalive < Date.now()) {
                    clearTimeout(keepalive);
                    keepaliveStart = Date.now();
                    keepalive = setTimeout(() => close("couldn't stay alive"), conf.keepaliveTimeout);
                }
            };
            const timeout = conf.connectionTimeout > 0 ? setTimeout(_ => close("timeout"), conf.connectionTimeout) : null;
            if (!uuid || this.#clients[uuid] || !(uuid in this.#webUUIDs)) return close("invalid key");
            this.#clients[uuid] = socket;
            delete this.#webUUIDs[uuid];
            printer.dev.debug("socket add: " + uuid);
            socket._send(SERVER2CLIENT.HANDSHAKE_REQUESTED);
            const prepareCodes = () => socket._clientPages && Object.keys(socket._clientPages).forEach(f => {
                if (!f || !(f.endsWith(".jsx") || f.endsWith(".tsx"))) return;
                const jsx = socket._clientPages[f].json;
                const clientFunctions = jsx.clientFunctionList;
                const fJ = JSON.stringify(f);
                beginCode[f] = makeBeginCode(uuid, clientFunctions, fJ);
                // todo: async functions for decorated functions // todo: check if html still works
            });
            prepareCodes();
            const onPageLoad = () => {
                if (!socket._mainFile) return;
                const jsx = socket._clientPages[socket._mainFile].json;
                const joinEvents = jsx.joinEvent;
                try {
                    Function("currentUUID", "currentClient", `${beginCode[socket._mainFile]};${joinEvents.map(i => i.code).join(";")};${joinEvents.map(i => `${i.name}()`).join(";")}`)(uuid, client);
                } catch (e) {
                    printer.dev.error(e);
                    close("internal server error");
                }
            };
            socket._externalLoad = (url, cPages) => {
                if (!cPages) return;
                socket._clientPages = cPages[0];
                socket._mainFile = cPages[1];
                socket._URL_ = url;
                prepareCodes();
                onPageLoad();
            };
            ka();
            socket.on("message", async data => {
                if (socket._closed) return close("bypass attempt");
                clearTimeout(timeout);
                try {
                    data = data.toString();
                    if (socket._closed) return;
                    if (_argv_["debug-socket"]) printer.dev.debug("< " + data);
                    if (data[0] === CLIENT2SERVER.HANDSHAKE_RESPONSE) { // handshake finished
                        if (socket._handshook) return close("one handshake is enough");
                        socket._handshook = true;
                        onPageLoad();
                        socket._send(SERVER2CLIENT.SURE_HANDSHAKE);
                        return;
                    }
                    if (!socket._handshook) return close("haven't handshook"); // todo: try to use jsx packets in html process and see if it can be exploited
                    if (!(socket._URL_.endsWith(".jsx") || socket._URL_.endsWith(".tsx"))) return;
                    if (data[0] === CLIENT2SERVER.SERVER_FUNCTION_REQUEST) { // @server function run request
                        if (!isJSX) return close("unauthorized");
                        const spl = data.substring(1).split(":")
                        const evalId = spl[0];
                        const page = spl[1];
                        const fnName = spl[2];
                        if (typeof beginCode[page] !== "string" || typeof socket._clientPages[page] !== "object") return close("invalid jsx");
                        const jsx = socket._clientPages[page].json;
                        const fn = jsx.serverFunctions[fnName];
                        if (!fn) return close("invalid function");
                        const hash = this.#hashes[uuid];
                        if (!hash) return;
                        let args;
                        try {
                            args = JSON.parse(spl.slice(3).join(":"));
                        } catch (e) {
                            return close("invalid json");
                        }
                        if (typeof args !== "object" || !Array.isArray(args)) return close("invalid function args");
                        const res = await Function("currentUUID", "currentClient", "...args", `${beginCode[page]};${fn.code};return ${fnName}(...args)`)(uuid, client, ...args);
                        if (fn.r) {
                            let r;
                            try {
                                r = JSON.stringify(res);
                            } catch (e) {
                                r = "undefined";
                                printer.dev.fail("Couldn't stringify the response from the '@server/respond -> " + fnName + "' function at '/" + socket._URL_ + "'.");
                                printer.dev.error(e);
                            }
                            socket._send(SERVER2CLIENT.SERVER_FUNCTION_RESPONSE + evalId + ":" + r);
                        }// else socket._send(SERVER2CLIENT.SERVER_FUNCTION_RESPONSE + evalId + ";undefined");
                    } else if (data[0] === CLIENT2SERVER.CLIENT_FUNCTION_RESPONSE) { // client-sided function response
                        if (!isJSX) return close("unauthorized");
                        const hasError = data[1] === "1";
                        const spl = data.substring(2).split(":");
                        const id = spl[0];
                        if (!id || !this.#evalResponses[id]) return close("invalid eval");
                        const raw = spl.slice(1).join(":");
                        let res;
                        const got = {
                            "true": true,
                            "false": false,
                            "null": null,
                            "undefined": undefined
                        };
                        try {
                            if (raw in got) res = got[raw];
                            else res = hasError ? new Error(raw) : JSON.parse(raw);
                        } catch (e) {
                            return close("invalid json");
                        }
                        this.#evalResponses[id](res);
                        delete this.#evalResponses[id];
                    } else if (data[0] === CLIENT2SERVER.KEEPALIVE) ka();
                } catch (e) {
                    printer.dev.error(e);
                    close("internal server error");
                }
            });
            socket.on("close", () => close("disconnect", false));
        });
        return server_;
    };

    async #builtJSX(file, code, req, res, files, pk, ls) {
        file = path.join(file);
        if (files[file] || res.headersSent) return;
        if (this.#builtJSXCache[file]) {
            files[file] = this.#builtJSXCache[file];
            pk[file] = files[file].pk;
            return;
        }
        let json;
        if (this.dev) {
            const inits = [];
            json = await this.#pseudoBuildJSX(file, code, null, inits);
            code = json.code;
            delete json.code;
            if (inits.length) {
                printer.dev.fail("A function with the decorator @server/start was found. Please use the main file instead.\n  Note: @server/start decorator can only be used in production mode!");
                res.json({error: "Internal server error"});
                return;
            }
        } else json = this.#jsxFunctions[file];
        if (!json) {
            printer.dev.fail("Couldn't find the JSX file in build: " + file);
            res.json({error: "Internal server error"});
            return;
        }
        const sr = json.serverFunctions;
        const k = Object.keys(sr);
        files[file] = {
            code,
            json,
            pk: {
                code,
                functions: k.filter(i => !sr[i].r),
                respondFunctions: k.filter(i => sr[i].r),
                client: json.clientFunctionList,
                clientLoad: json.clientLoadFunctionList
            }
        };
        pk[file] = files[file].pk;
        if (!ls) {
            ls = req._Allow;
            const deny = req._Deny;
            if (deny === "*") ls = [];
            else if (ls === "*") {
                if (this.dev) {
                    ls = [];
                    const d = h => {
                        const p = path.join(this.#dir, conf.srcFolder, h);
                        const fl = fs.readdirSync(p);
                        for (const i of fl) {
                            const fl = path.join(p, i);
                            if (!fs.existsSync(fl)) return;
                            if (fs.statSync(fl).isFile()) {
                                const p = (h ? h + "/" : "") + i;
                                if (!deny.includes(p)) ls.push(p);
                            } else d((h ? h + "/" : "") + i)
                        }
                    };
                    d("");
                } else ls = Object.keys(this.#buildCache).filter(i => !deny.includes(i));
            }
        }
        for (const f of ls) {
            let c;
            if (this.dev) c = this.cacheDevFile(path.join(this.#dir, conf.srcFolder, f));
            else c = await this.cacheBuildFile(f);
            if (!c) c = "";
            if (f.endsWith(".jsx") || f.endsWith(".tsx")) await this.#builtJSX(f, c, req, res, files, pk);
            else {
                if (c instanceof Buffer) c = [...c];
                files[f] = c;
                pk[f] = c;
            }
        }
        if (!this.dev) this.#builtJSXCache[file] = files[file];
    };

    async renderJSX(file, code, req, res, fromScript = false) {
        this.prepLoad(req, res);
        const r = this.random();
        if (!this.#realtime) return res.json({error: "Expected 'realtime' option in the 'hizzy.json' to be true."});
        if (fromScript) {
            const cPages = await this.#getPagePacket(file, code, req, res);
            req.__socket._externalLoad(file, this.#clientPages[req._uuid]);
            if (req.headers["hizzy-cache"] === "yes") return res.send("ok");
            return res.send(req._RouteJSON + "\u0000" + cPages);
        }
        this.#hashes[req._uuid] = r;
        this.sendRawFile(".html", `<script data-rm=${r} type=module>${jsxInjection
            .replace("$$R$$", r)
            .replace("$$R$$", r) // it's important that it's ran exactly 2 times!
            .replace("$$CONF$$", "['" + r + "','" + (this.#buildRuntimeId || runtimeId) + "'," + this.#builtAt + "," +
                (conf.keepaliveTimeout > 0 ? conf.clientKeepalive : -1) + "," + req._RouteJSON + "," +
                await this.#getPagePacket(file, code, req, res) + "," + (this.dev ? 1 : 0) + ",'" + experimentalId + "']"
            )
        }</script>`, res);
    };

    async #getPagePacket(file, code, req, res) {
        let files = {}, pk = {}, pkJ;
        const l = req.url.split("?")[0];
        if (this.#builtJSXPage[l]) {
            [files, pkJ] = this.#builtJSXPage[l];
        } else {
            try {
                await this.#builtJSX(file, code, req, res, files, pk);
            } catch (e) {
                printer.dev.error(e);
                res.json({error: "Internal server error"});
                return;
            }
            if (res.headersSent) return;
            pkJ = JSON.stringify(pk);
            if (!this.dev) this.#builtJSXPage[l] = [files, pkJ];
        }
        this.#clientPages[req._uuid] = [files, path.join(file)];
        this.#watchFile(req._Route);
        return pkJ;
    };

    renderHTML(file, content, req, res) {
        // todo: oauth for discord, github, google, microsoft, xbox, facebook and more
        this.prepLoad(req, res);
        const r = this.random();
        this.#watchFile(req._Route);
        this.sendRawFile(".html", content + (this.#realtime ? `<script data-rm=${r}>` + htmlInjection
            .replace("$R", r)
            .replace("$T", conf.keepaliveTimeout > 0 ? conf.clientKeepalive : -1) + `</script>` : ""), res
        );
    };

    #watchFile(file) {
        if (!this.dev || this.#watchingFiles[file] || !this.autoRefresh) return;
        if (!file.endsWith(".html") && !file.endsWith(".jsx") && !file.endsWith(".tsx")) return; // todo: maybe if one updates, update everything related
        this.#watchingFiles[file] = true;
        fs.watchFile(path.join(this.#dir, conf.srcFolder, file), {interval: 1}, () => {
            for (const uuid in this.#clients) {
                const client = this.#clients[uuid];
                if (client._URL_ !== file) return;
                client._send(SERVER2CLIENT.FILE_REFRESH);
            }
        });
    };

    sendRawFile(file, content, res) {
        if (res.headersSent) return;
        res.setHeader("Content-Type", mime.getType(file));
        res.send(content);
    };

    async sendFile(file, content, req, res, isStatic = false) {
        const fromScript = req.headers["sec-fetch-dest"] === "script" || req.headers["hizzy-dest"] === "script";
        if (fromScript && !req.__socket) return res.json({error: "Unauthorized"});
        if (!isStatic && (file.endsWith(".jsx") || file.endsWith(".tsx"))) return this.renderJSX(file, content, req, res, fromScript);
        if (!isStatic && file.endsWith(".html") && !fromScript) return this.renderHTML(file, content, req, res);
        if (file.endsWith(".css") && fromScript) {
            file += ".js"; // todo: maybe use those weird css copies that add new functionalities?
            content = `let st=document.createElement("style");st.innerHTML=${JSON.stringify(content.toString())};document.head.appendChild(st);export default st`;
        }
        if (file.endsWith(".html") && fromScript) {
            content = `export default new DOMParser().parseFromString(${JSON.stringify(content.toString())},"text/html")`;
            file += ".js";
        }
        this.sendRawFile(file, content, res);
    };

    #staticRender(req, res) {
        if (Object.keys(conf.static).length === 0) return this.notFound(req, res);
        const l = req.url.substring(1).split("?")[0];
        for (const folder in conf.static) {
            const p = path.join(this.#dir, folder, conf.static[folder], l);
            if (fs.existsSync(p) && fs.statSync(p).isFile()) return this.sendFile(l, fs.readFileSync(p), req, res, false);
        }
        return this.notFound(req, res);
    };

    #invalidFile(res, l) {
        res.send("Couldn't find the file. " + (this.dev ? "File does not exist: " + xss.filterXSS(l) : "Please report this to the owner of the web site."));
    };

    #devRender(l, req, res) {
        const p = path.join(this.#dir, conf.srcFolder, l);
        if (!fs.existsSync(p)) return this.#staticRender(req, res);
        const content = this.cacheDevFile(p);
        if (!content) return this.#invalidFile(res, l);
        this.sendFile(l, content, req, res).then(r => r);
    };

    async #buildRender(l, req, res) {
        const f = await this.cacheBuildFile(l);
        if (!f) return this.#invalidFile(res, l);
        await this.sendFile(l, f, req, res);
    };

    #formatLocalURL(address) {
        const {port} = this.#serverAddress;
        return `http${this.#https ? "s" : ""}://${address}${port === 80 ? "" : ":" + port}/`;
    };

    #sendURLs() {
        const {address, family} = this.#serverAddress;
        printer.raw.log(`  %c➜%c  Local:   %c${this.#formatLocalURL(family === "IPv6" ? "localhost" : address)}`, "color: greenBright", "", "color: cyan");
        if (_argv_.host) printer.raw.log(`  %c➜%c  Network: %c` + addresses.map(i => this.#formatLocalURL(i)).join(", "), "color: greenBright", "", "color: cyan");
        else printer.raw.log(`  %c➜  Network: use %c--host%c to expose`, "color: gray", "", "color: gray");
    };

    openInBrowser() {
        open("http://localhost:" + this.#port);
    };

    async #hasVSC() {
        return await new Promise(r => exec("code --version", err => r(!err)));
    };

    async listen() {
        if (this.#listening) await new Promise(r => this.server.close(r));
        this.#listening = false;
        let port_ = _argv_.port * 1;
        if (port_ < 0) port_ = 0;
        this.#port = port_;
        await new Promise(r => this.server.listen(port_, () => r(true)));
        this.#listening = true;
        if (this.#isInputOn) return;
        this.#isInputOn = true;
        const addons = this.getAddons();
        for (const p in addons) addons[p].module.onEnable();
        if (!this.#addonCache) {
            const addons = this.getAddons();
            const addonPks = [];
            for (const i in addons) {
                const pl = addons[i];
                const m = [
                    pl.module.name,
                    (pl.module.onClientSideLoad || "") + "",
                    (pl.module.onClientSideRendered || "") + "",
                    (pl.module.onClientSideError || "") + ""
                ];
                if (m.slice(1).every(i => !i)) continue;
                if (!this.dev) for (const i in m) m[i] = m[i] ? require("uglify-js").minify(m[i]).code : "";
                addonPks.push(m);
            }
            this.#addonCache = JSON.stringify(addonPks);
        } // todo: maybe cache in build? but it would require it to cache the config file as well
        this.#initFunctions.forEach(i => i());
        const {port} = this.#serverAddress = this.server.address();
        this.#port = port;
        if (!this.dev) printer.println("");
        printer.raw.log("  %cHIZZY v" + __VERSION__ + "%c  ready in%c " + timeForm(Date.now() - __sT__), "color: yellow", "color: gray", "");
        delete global["__sT__"];
        printer.println("");
        printer.inline.log(`  %c➜%c  Mode:    %c${this.dev ? "Development" : "Production"}`, "color: greenBright", "", "color: " + (this.dev ? "orange" : "green"));
        if (port_ <= 0) printer.inline.log("%c, randomized port", "color: gray");
        if (_argv_.debug) printer.inline.log("%c, debugging", "color: gray");
        printer.inline.print("\n");
        this.#sendURLs();
        printer.raw.log(`  %c➜%c  press %ch%c to show help\n`, "color: gray", "color: gray", "color: whiteBright", "color: gray");
        stdin.setRawMode(true);
        stdin.resume();
        let lastCmd = null;
        let vscProm = null;
        const hasVSC = await this.#hasVSC();
        const shortcuts = {
            h: {
                description: "show this menu", enabled: true, noRepeat: true,
                run: () => {
                    printer.raw.println("");
                    printer.raw.log("  Shortcuts");
                    for (const key in shortcuts) {
                        const shortcut = shortcuts[key];
                        if (!shortcut.enabled) continue;
                        printer.raw.log("%c  press %c" + key + "%c to " + shortcut.description, "color: gray", "", "color: gray");
                    }
                    printer.raw.println("");
                }
            },
            r: {
                description: "restart the server", enabled: true,
                run: async () => {
                    if (!this.#listening) return;
                    await this.listen();
                    printer.raw.log("%c  ➜  Restarted the server.", "color: green");
                }
            },
            b: {
                description: "build", enabled: !this.dev,
                run: async () => {
                    await this.build();
                    await this.scanBuild();
                }
            },
            s: {
                description: "re-scan the build", enabled: !this.dev,
                run: async () => await this.scanBuild()
            },
            u: {
                description: "show server url", enabled: true, noRepeat: true,
                run: () => {
                    printer.raw.println("");
                    this.#sendURLs();
                    printer.raw.println("");
                }
            },
            o: {
                description: "open in browser", enabled: true, noRepeat: true,
                run: () => this.openInBrowser()
            },
            c: {
                description: "clear the console", enabled: true,
                run: () => printer.clear()
            },
            v: {
                description: "open VS Code in here", enabled: hasVSC, noRepeat: true,
                run: async () => {
                    vscProm = new Promise(r => exec("code \"" + this.#dir + "\"", r));
                    const res = await vscProm;
                    if (!res) printer.raw.log("%c  ✓  Opened VS Code!", "color: green");
                    else printer.raw.log("%c  ✕  Failed to open VS Code.", "color: red");
                }
            },
            a: {
                description: "re-enable all addons", enabled: true,
                run: () => {
                    for (const i in Addon.addons) Addon.addons[i].module.onDisable("shortcut");
                    printer.raw.log("%c  ✓  All addons have been disabled.", "color: green");
                    for (const i in Addon.addons) Addon.addons[i].module.onEnable();
                    printer.raw.log("%c  ✓  All addons have been enabled.", "color: green");
                }
            },
            q: {
                description: "quit", enabled: true,
                run: () => {
                    printer.raw.log("%c  ✕  Stopped the process.", "color: red; font-weight: bold");
                    process.exit();
                }
            },
            ...this.customShortcuts
        };
        let cmdPromise = null;
        stdin.on("data", async c => {
            c = c.toString();
            if (c === "\x0c") return printer.clear();
            if (c === "\x03") {
                printer.raw.log("%c  ✕  Stopped the process.", "color: red; font-weight: bold");
                process.exit();
            }
            const shortcut = shortcuts[c];
            if (!shortcut || (shortcut.noRepeat && lastCmd === c)) return;
            lastCmd = c;
            await this.waitBuild();
            await this.waitBuildScanning();
            await vscProm;
            await cmdPromise;
            let onEnd;
            cmdPromise = new Promise(r => onEnd = r);
            await shortcut.run();
            onEnd();
        });
        if (_argv_.open) this.openInBrowser();
    };

    async #buildInternal(to, dat = [0], original, src, jsx, blur) {
        const srcPath = path.join(this.#dir, conf.srcFolder);
        for (const file of fs.readdirSync(path.join(srcPath, ...to))) {
            const p = path.join(srcPath, ...to, file);
            if (!fs.existsSync(p)) continue;
            if (fs.statSync(p).isDirectory()) {
                await this.#buildInternal(
                    [...to, file], dat,
                    original ? original.folder(file) : null,
                    src.folder(file),
                    jsx.folder(file),
                    blur.folder(file)
                );
                continue;
            }
            const actualContent = fs.readFileSync(p);
            let content = actualContent;
            let e = false;
            let ext = file.split(".");
            ext = ext[ext.length - 1];
            try {
                if (ext === "jsx") {
                    const norm = await this.readClientJSX(file, actualContent.toString());
                    content = norm.code;
                    delete norm.code;
                    jsx.file(file.substring(0, file.length - 4) + ".json", JSON.stringify(norm));
                } else if (["html", "js", "css"].includes(ext)) {
                    content = actualContent.length ? await minify[ext](actualContent.toString()) : "";
                } else if (["jpeg", "jpg", "png", "webp", "gif", "avif"].includes(ext)) {
                    const img = require("sharp")(content);
                    const {width, height} = await img.metadata();
                    const ratio = width / height;
                    const fixed = 100;
                    blur.file(file, "data:" + mime.getType(file) + ";base64," + (await img.resize({
                        width: fixed * ratio,
                        height: fixed / ratio
                    }).toBuffer()).toString("base64"));
                }
            } catch (err) {
                printer.dev.fail("Failed to build: " + path.join(...to, file));
                printer.dev.error(err);
                dat[0]++;
                e = true;
            }
            src.file(file, content);
            if (original) original.file(file, actualContent);
            if (!e) printer.dev.debug("Built " + path.join(...to, file));
        }
    };

    async build() {
        if (this.dev) return;
        if (this.#isBuilding) await this.#buildPromise;
        this.#isBuilding = true;
        let onEnd;
        this.#buildPromise = new Promise(r => onEnd = r);
        if (fs.existsSync(path.join(this.#dir, conf.srcFolder))) {
            const d = Date.now();
            let dat = [0];
            const zip = new (require("jszip"))();
            await this.#buildInternal(
                [], dat,
                conf.includeOriginalInBuild ? zip.folder("original") : null,
                zip.folder("source"),
                zip.folder("jsx"),
                zip.folder("blur")
            );
            /*const modules = zip.folder("node_modules");
            const modulesPath = path.join(this.#dir, "node_modules");
            if (fs.existsSync(modulesPath) && fs.statSync(modulesPath).isDirectory()) for (const f of fs.readdirSync(modulesPath)) {
                const p2 = path.join(modulesPath, f);
                if (!fs.existsSync(p2) || !fs.statSync(p2).isDirectory()) continue;
                const pkgPath = path.join(p2, "package.json");
                if (!fs.existsSync(pkgPath) || !fs.statSync(pkgPath).isFile()) continue;
                let pkg;
                try {
                    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
                } catch (e) {
                    printer.dev.fail("Failed to build: " + p2);
                    printer.dev.error(e);
                    continue;
                }
                if (typeof pkg !== "object" || pkg === null || Array.isArray(pkg)) continue;
                const {main, type} = pkg;
                let bundled;
                try {
                    const opts = {
                        entryPoints: [path.join(p2, main)],
                        bundle: true,
                        minify: true,
                        outdir: path.join(this.#dir, "_out_")
                    };
                    if (type === "module") opts.format = "esm";
                    bundled = await build(opts);
                } catch (e) {
                    printer.dev.fail("Failed to build: " + p2);
                    printer.dev.error(e);
                    continue;
                }
                modules.file(f, fs.readFileSync(path.join(this.#dir, "_out_", "index.min.js")));
            }*/
            zip.file("time", Date.now() + "");
            zip.file("runtime", runtimeId + "");
            const mainPath = path.join(this.#dir, conf.srcFolder, conf.main);
            const code = this.jsxToJS(fs.readFileSync(mainPath), path.extname(conf.main));
            if (code instanceof Error) return exit("Couldn't build the main file!", code);
            zip.file("main", code);
            if (this.#firstBuild) {
                this.#firstBuild = false;
                const mainPath = path.join(this.#dir, conf.srcFolder, conf.main);
                const mainExtension = path.extname(mainPath);
                const mainExtensions = [".jsx", ".tsx"];
                if (!mainExtensions.includes(mainExtension)) return exit("Invalid file extension for the main file: " + mainExtension + ", expected: " + mainExtensions.join(" or "));
                if (!fs.statSync(mainPath).isFile()) return exit("Main file not found: " + mainPath);
            }
            fs.writeFileSync(path.join(this.#dir, ".build"), await zip.generateAsync({type: "nodebuffer"}));
            const dt = Date.now() - d;
            if (dat[0] === 0) printer.dev.pass("Built. (%c" + timeForm(dt) + "&t)", "color: orange");
            else printer.dev.fail("Built with %c" + dat[0] + "&t error" + (dat[0] > 1 ? "s" : "") + ". (%c" + timeForm(dt) + "&t)", "color: blue", "color: blue");
        } else printer.dev.warn("Skipping building since there is no %c/" + conf.srcFolder + "&t folder...", "color: orange");
        this.#isBuilding = false;
        onEnd();
        if (!this.#buildCache && !_argv_["just-build"]) await this.scanBuild();
    };

    async scanBuild() {
        if (this.dev) {
            if (!this.#listening && conf.listen) await this.listen();
            return;
        }
        if (this.#isBuilding) await this.waitBuild();
        if (this.#isScanningBuild) await this.waitBuildScanning();
        if (!fs.existsSync(path.join(this.#dir, ".build"))) await this.build();
        this.#isScanningBuild = true;
        this.#buildCache = {};
        this.#blurCache = {};
        this.#jsxCache = {};
        this.#builtJSXCache = {};
        this.#builtJSXPage = {};
        let onEnd;
        this.#scanPromise = new Promise(r => onEnd = r);
        const d = Date.now();
        const zip = new (require("jszip"))();
        await zip.loadAsync(fs.readFileSync(path.join(this.#dir, ".build")));
        //const tmpdir = path.join(this.#dir, ".hizzy");
        //if (fs.existsSync(tmpdir)) fs.rmSync(tmpdir, {recursive: true});
        //fs.mkdirSync(tmpdir);
        //let tmpDate = Date.now() + "";
        //fs.mkdirSync(path.join(tmpdir, tmpDate));
        //fs.writeFileSync(path.join(tmpdir, tmpDate, "package.json"), `{"type":"module"}`);
        //const isExtracting = conf.extractBuild && !fs.existsSync(path.join(this.#dir, conf.srcFolder));
        //if (isExtracting) fs.mkdirSync(path.join(this.#dir, conf.srcFolder));
        let builtAt;
        let buildRuntimeId;
        let mainCode;
        for (const file in zip.files) {
            const dat = zip.files[file];
            if (dat.dir) {
                //if (isExtracting) fs.mkdirSync(path.join(this.#dir, conf.srcFolder, file));
                //fs.mkdirSync(path.join(tmpdir, tmpDate, file), {recursive: true});
                continue;
            }
            let data = await dat.async("nodebuffer");
            if (file === "time") {
                builtAt = data.toString() * 1;
                continue;
            }
            if (file === "runtime") {
                buildRuntimeId = data.toString();
                continue;
            }
            if (file === "main") {
                if (!this.#firstScan) continue;
                this.#firstScan = true;
                mainCode = data;
                continue;
            }
            //if (isExtracting) fs.writeFileSync(path.join(this.#dir, conf.srcFolder, file), data);
            if (file.startsWith("source/")) {
                const fileNormal = file.substring(7);
                if (file.endsWith(".jsx") || file.endsWith(".tsx")) {
                    data = data.toString();
                    const jsxJson = "jsx/" + file.substring(7, file.length - 4) + ".json";
                    let jsonData;
                    try {
                        jsonData = JSON.parse(await zip.files[jsxJson].async("string"));
                        await this.#pseudoBuildJSX(fileNormal, data, jsonData, this.#initFunctions);
                    } catch (e) {
                        printer.dev.warn("Couldn't scan JSX: '" + fileNormal + "', meta file is missing or corrupted. Try rebuilding.");
                        printer.dev.error(e);
                    }
                } else this.#buildCache[fileNormal] = data;
            } else if (file.startsWith("blur/")) {
                const fileNormal = file.substring(5);
                this.#blurCache[fileNormal] = "data:" + mime.getType(fileNormal) + ";base64," + Buffer.from(data).toString("base64");
            }
        }
        if (!builtAt) return exit("Invalid build: No timestamp found! Try rebuilding.");
        if (!buildRuntimeId) return exit("Invalid build: No runtime ID found for the build! Try rebuilding.");
        //if (fs.existsSync(tmpdir)) fs.rmSync(tmpdir, {recursive: true});
        const dt = Date.now() - d;
        printer.dev.pass("Scanned the build. (%c" + timeForm(dt) + "&t)", "color: orange");
        this.#isScanningBuild = false;
        this.#builtAt = builtAt;
        this.#buildRuntimeId = buildRuntimeId;
        if (mainCode) await this.processMain(mainCode);
        onEnd();
        if (!this.#listening && conf.listen && !_argv_["just-build"]) await this.listen();
    };

    async #pseudoBuildJSX(file, code, json, inits) {
        let data = code;
        if (!json) {
            json = await this.readClientJSX(file, code);
            data = json.code;
        }
        this.#jsxFunctions[file] = json;
        const clientFunctions = json.clientFunctionList;
        inits.push(...json.serverInit.map(i => Function(`${makeBeginCode(null, clientFunctions, JSON.stringify(path.join(file)))}${i.code};${i.name}();`)));
        if (!this.#buildCache) this.#buildCache = {};
        this.#buildCache[file] = data;
        return json;
    }

    #addImport(name, file, d) {
        if (this.#importMap[name]) return file && this.#importMap[name].push(file);
        const p = path.join(this.#dir, "node_modules", name);
        if (!fs.existsSync(p)) return d.push(name);
        const {dependencies, main} = require(path.join(p, "package.json"));
        this.#importMap[name] = {};
        const addFolder = folder => {
            const actual = path.join(this.#dir, "node_modules", name, folder);
            fs.readdirSync(actual).forEach(i => {
                if (fs.statSync(path.join(actual, i)).isFile()) this.#importMap[name][folder + (folder ? "/" : "") + i] = fs.readFileSync(path.join(actual, i));
                else addFolder(folder + (folder ? "/" : "") + i);
            });
        };
        addFolder("");
        this.#importMains[name] = main;
        Object.keys(dependencies).forEach(i => this.#addImport(i, file, d));
    };

    async processMain(data) {
        if (data instanceof Buffer) data = data.toString();
        if (typeof data === "object") {
            printer.dev.error(data);
            return process.exit();
        }
        // noinspection JSUnresolvedReference
        const React = global["R" + (this.#buildRuntimeId || runtimeId)] = (...a) => require("preact").createElement(...a);
        Hizzy.Routes = global.Routes = () => React("div", null);
        Hizzy.Route = global.Route = () => React("div", null);
        let mainResponse;
        const tDir = path.dirname(path.join(this.#dir, conf.srcFolder, conf.main));
        const tPath = path.join(tDir, "t" + random() + "--" + path.basename(conf.main) + "--.js");
        const tPkgPath = path.join(tDir, "package.json");
        let pkgN;
        const rmf = () => {
            if (fs.existsSync(tPath)) fs.rmSync(tPath, {recursive: true});
            if (pkgN !== false) {
                if (pkgN) fs.writeFileSync(tPkgPath, pkgN);
                else fs.rmSync(tPkgPath, {recursive: true});
            }
        };
        try {
            if (fs.existsSync(tPkgPath)) {
                const p = JSON.parse(pkgN = fs.readFileSync(tPkgPath, "utf8"));
                if ((p.type === "module") !== conf.mainModule) {
                    if (conf.mainModule) p.type = "module";
                    else delete p.type;
                    fs.writeFileSync(tPkgPath, JSON.stringify(p));
                } else pkgN = false;
            } else fs.writeFileSync(tPkgPath, conf.mainModule ? `{"type":"module"}` : "{}")
            fs.writeFileSync(tPath, data);
            mainResponse = await import(url.pathToFileURL(tPath));
            // if(conf.mainModule) mainResponse = await import("data:application/javascript;base64," + Buffer.from(data.toString()).toString("base64"));
            // else Function(data.toString())();
        } catch (e) {
            rmf();
            printer.dev.error(e);
            return process.exit();
        }
        rmf();
        if (!mainResponse || !(mainResponse = mainResponse.default))
            return exit("Expected a valid 'export default' from the main file.");
        if (mainResponse.type !== Routes)
            return exit("Expected the 'export default' from the main file to be a Routes component!");
        const routes = {};
        const makeRoute = async (s, u = "") => {
            if (typeof s === "object" && !Array.isArray(s)) {
                if (s.type !== Route)
                    return exit("Expected every child component of the Routes component to be a Route component!");
                const p = path.join(u, s.props.path || "").replaceAll(path.sep, "/");
                if (s.props.children) await makeRoute(s.props.children, p);
                if (!s.props.path) return;
                if (routes[p])
                    return exit("Cannot add multiple routes to the same endpoint: " + p);
                const r = path.join(s.props.route || "");
                let allow = s.props.allow;
                if (allow === undefined) allow = "*";
                let deny = s.props.deny;
                if (deny === undefined) deny = [];
                const msg = "Route '" + r + "'s 'allow' property is invalid, expected \"*\" or an array of strings, got: ";
                if (typeof allow === "string") {
                    if (allow !== "*") return exit(msg, allow);
                } else if (typeof allow !== "object" || !Array.isArray(allow) || allow.some(i => typeof i !== "string")) return exit(msg, allow);
                const msg2 = "Route '" + r + "'s 'deny' property is invalid, expected \"*\" or an array of strings, got: ";
                if (typeof deny === "string") {
                    if (deny !== "*") return exit(msg2, deny);
                } else if (typeof deny !== "object" || !Array.isArray(deny) || deny.some(i => typeof i !== "string")) return exit(msg2, deny);
                routes[p] = {
                    route: r,
                    routeJSON: JSON.stringify(r),
                    allow,
                    deny,
                    onRequest: s.props.onRequest,
                    method: (s.props.method || "get").toLowerCase()
                };
                return;
            }
            for (const i of s) await makeRoute(i, u);
        };
        if (mainResponse.props.children) await makeRoute(mainResponse.props.children);
        this.routes = routes;
        const METHODS = ["all", "get", "post", "put", "delete", "patch", "options", "head"];
        for (const url in this.routes) {
            const {route, method, routeJSON, allow, deny, onRequest} = this.routes[url];
            if (!METHODS.includes(method)) {
                printer.dev.warn("Invalid method: " + method + ", expected one of these: " + METHODS.join(", "));
                continue;
            }
            this.app[method](url, async (req, res) => {
                // todo: make main file reloadable with custom intervals and removal of all app[method]s
                req._Route = route;
                req._RouteJSON = routeJSON;
                req._Allow = allow;
                req._Deny = deny;
                let next = async () => {
                    if (this.dev) this.#devRender(route, req, res);
                    else await this.#buildRender(route, req, res);
                };
                if (typeof onRequest === "function") onRequest(req, res, next);
                else if (typeof onRequest === "object" && Array.isArray(onRequest)) {
                    const r = i => {
                        if (i === onRequest.length) return next();
                        onRequest[r](req, res, () => r(i + 1));
                    };
                    await r(0);
                } else await next();
            });
        }
        this.app.get("*", (req, res) => this.#staticRender(req, res));
    };

    async readClientJSX(file, jsxCode) {
        if (file === conf.main) return {
            code: `throw "Cannot access the main file.";`,
            serverFunctions: {},
            clientFunctionList: [],
            serverInit: [],
            joinEvent: [],
            leaveEvent: [],
            clientLoadFunctionList: []
        };
        const jsCode = this.jsxToJS(jsxCode, path.extname(file));
        if (jsCode instanceof Error) throw jsCode;
        const ast = babelParser.parse(jsCode, {sourceType: "module"});
        const serverFunctions = {};
        const clientFunctionList = [];
        const clientLoadFunctionList = [];
        const serverInit = [];
        const joinEvent = [];
        const leaveEvent = [];
        let newJSCode = jsCode;
        let deltaIndex = 0;
        const replaceText = ({start, end}, text) => {
            newJSCode = newJSCode.substring(0, start + deltaIndex) + text + newJSCode.substring(end + deltaIndex);
            deltaIndex += start - end + text.length;
        };
        const impNm = {};
        const clip = ({start, end}) => jsCode.substring(start, end);
        const fileJ = JSON.stringify(file);
        const processFunction = (start, end, leadingComments, name, code) => {
            for (const comment of leadingComments) {
                const lines = comment.value.split("\n");
                for (const line of lines) {
                    const t = line.replaceAll("*", "").trim();
                    if (["@server", "@server/respond"].includes(t)) {
                        replaceText({start, end}, `const ${name}=FN${runtimeId}("${name}");`);
                        if (t === "@server") serverFunctions[name] = {r: false, code, start, end};
                        else serverFunctions[name] = {r: true, code, start, end};
                    } else if (["@server/start", "@server/join", "@server/leave"].includes(t)) {
                        replaceText({start, end}, "");
                        if (t === "@server/start") serverInit.push({name, code, start, end});
                        else if (t === "@server/join") joinEvent.push({name, code, start, end});
                        else leaveEvent.push({name, code, start, end});
                    } else if (t === "@client/render") {
                        clientLoadFunctionList.push(name);
                        clientFunctionList.push(name);
                    } else continue;
                    return;
                }
            }
            clientFunctionList.push(name); // removed ` if (t === "@client")`
        };
        traverse(ast, {
            FunctionDeclaration: ({node}) => {
                const {leadingComments} = node;
                if (!node.id) return;
                if (leadingComments) processFunction(node.start, node.end, leadingComments, node.id.name, clip(node));
                else clientFunctionList.push(node.id.name); // now every other function is a client function
            },
            ImportDeclaration: ({node}) => {
                if (node.type !== "ImportDeclaration") return;
                let imN = clip(node.source);
                // hizzy prefix:
                let df = `await H${runtimeId}.I${runtimeId}(${imN},${fileJ});`;
                if (!impNm[imN]) impNm[imN] = df;
                let nc = "";
                if (node.specifiers.length === 0) {
                    if (impNm[imN] === df) nc += df;
                } else {
                    const specMap = {
                        ImportDefaultSpecifier: [],
                        ImportSpecifier: [],
                        ImportNamespaceSpecifier: []
                    };
                    for (const specifier of node.specifiers) {
                        const X = clip(specifier.local);
                        const I = specifier.imported ? clip(specifier.imported) : X;
                        specMap[specifier.type].push([X, I]);
                    }
                    if (specMap.ImportNamespaceSpecifier.length !== 0) {
                        const N = specMap.ImportNamespaceSpecifier[0][0];
                        nc += `const ${N}=${impNm[imN]};`;
                        if (N.length < impNm[imN].length) impNm[imN] = N;
                        for (let i = 1; i < specMap.ImportNamespaceSpecifier.length; i++)
                            nc += `const ${specMap.ImportNamespaceSpecifier[i][0]}=${N};`;
                    }
                    if (specMap.ImportDefaultSpecifier.length !== 0) {
                        const N = specMap.ImportDefaultSpecifier[0][0];
                        nc += `const{default:${N}}=${impNm[imN]};`;
                        for (let i = 1; i < specMap.ImportDefaultSpecifier.length; i++)
                            nc += `const ${specMap.ImportDefaultSpecifier[i][0]}=${N};`;
                    }
                    if (specMap.ImportSpecifier.length !== 0)
                        nc += `const{${specMap.ImportSpecifier.map(([X, I]) => X === I ? `${X}` : `${I}:${X}`).join(",")}}=${impNm[imN]};`;
                }
                replaceText(node, nc);
            },
            Import: ({parent}) => {
                if (parent.type !== "CallExpression") return;
                if (parent.arguments.length >= 1) {
                    const inside = clip(parent.arguments[0]);
                    // hizzy prefix:
                    replaceText(parent, impNm[inside] || `await H${runtimeId}.I${runtimeId}(${inside},${fileJ});`);
                }
                /*import * as D from "./App2";
                import A from "./App2"
                import "./App2";
                import {B,G} from "./App2";
                import {B as H} from "./App2";
                import("./App2")
                import E, * as F from "./App2";*/
            },
            ExportDefaultDeclaration: ({node}) => {
                /*
                export default [{Q: 1, L: [{}]}];
                export default 1;
                */
                const text = clip(node.declaration);
                // hizzy prefix:
                replaceText(node, `H${runtimeId}.E${runtimeId}[${fileJ}].default=${text};`);
            },
            ExportNamedDeclaration: ({node}) => {
                // hizzy prefix:
                const st = `H${runtimeId}.E${runtimeId}[${fileJ}]`;
                let nc = "";
                if (node.declaration) {
                    /*
                    export const M = 1;
                    export let L = 2, H = 1;
                    export let [U, Y] = [1, 2];
                    export var N = 1;
                    */
                    const kind = node.declaration.kind;
                    for (const dec of node.declaration.declarations) {
                        const init = clip(dec.init);
                        if (dec.id.type === "Identifier") nc += `Object.defineProperty(${st},"${dec.id.name}",{get:()=>${init}});`;
                        else {
                            const ls = [];
                            const ch = s => {
                                if (s.type === "Identifier") return ls.push(s.name);
                                if (s.type === "ArrayPattern") return s.elements.forEach(ch);
                                if (s.type === "ObjectPattern") return s.properties.forEach(i => ch(i.value));
                                exit("Not defined export.left type: " + s.type + ", please report this behavior.");
                            };
                            ch(dec.id);
                            nc += `await (async()=>{let ${init}=${clip(dec.id)};${ls.map(i => kind === "const" ? `Object.defineProperty(${st},"${i}",{get:()=>${i}})` : `${st}.${i}=${i}`).join(";")}})();`;
                        }
                    }
                } else {
                    /*
                    export {A, B};
                    export {A as K};
                    */
                    for (const spec of node.specifiers) nc += `${st}.${clip(spec.local)}=${clip(spec.exported)};`;
                }
                replaceText(node, nc);
            },
            VariableDeclaration: ({node: {declarations, leadingComments, kind}}) => {
                if (!declarations || !leadingComments || !leadingComments.length) return;
                for (const dec of declarations) {
                    const {init} = dec;
                    if (!["ArrowFunctionExpression", "FunctionExpression"].includes(init.type)) continue;
                    if (leadingComments) processFunction(dec.start - kind.length - 1, dec.end, leadingComments, dec.id.name, kind + " " + clip(dec));
                    else clientFunctionList.push(dec.id.name);
                }
            }
            /*
            ExportNamespaceSpecifier
            ExportSpecifier
            DeclareExportDeclaration
            ExportAllDeclaration
            DeclareExportAllDeclaration
            ExportDefaultSpecifier
            */
        });
        const c = this.dev ? newJSCode : require("uglify-js").minify(newJSCode, {
            module: true,
            compress: {toplevel: false},
            keep_fnames: true
        });
        if (c.error) throw c.error;
        return {
            code: typeof c === "string" ? c : c.code,
            serverFunctions,
            clientFunctionList,
            serverInit,
            joinEvent,
            leaveEvent,
            clientLoadFunctionList
        };
    };

    async waitBuild() {
        return await this.#buildPromise;
    };

    async waitBuildScanning() {
        return await this.#scanPromise;
    };

    async sendEvalTo(uuid, code) {
        const client = this.#clients[uuid];
        if (!client) return false;
        const pId = this.#evalId++;
        client._send(SERVER2CLIENT.CLIENT_FUNCTION_REQUEST + pId + ":" + code);
        let cb;
        let pr = new Promise(r => cb = r);
        this.#evalResponses[pId] = cb;
        const res = await pr;
        delete this.#evalResponses[pId];
        return res;
    };

    clientUUIDs() {
        return Object.keys(this.#clients);
    };

    async broadcastEval(code) {
        const obj = {};
        for (const i of this.clientUUIDs()) obj[i] = await this.sendEvalTo(i, code);
        return obj;
    };

    getHash(uuid) {
        return this.#hashes[uuid] || null;
    };

    findClient(uuid) {
        const client = this.#clients[uuid];
        if (!client) return null;
        return new Client(client);
    };

    findSocket(uuid) {
        return this.#clients[uuid] || null;
    };

    get directory() {
        return this.#dir;
    };

    makeClientFunction(file, name, uuid = null) {
        return makeClientFunction(file, name, uuid);
    };

    getAddons() {
        return Addon.addons;
    };

    getAddon(name) {
        return Addon.addons[name] || null; // todo: don't use sharp package by default and make the blur effect an addon
    };

    jsxToJS(jsx, extension) {
        try {
            return babel.transformSync(jsx, {
                filename: extension,
                presets: [
                    ["@babel/preset-react", {
                        pragma: "R" + runtimeId,
                        pragmaFrag: "F" + runtimeId
                    }],
                    ...(extension === ".tsx" ? ["@babel/preset-typescript"] : [])
                ] // todo: use real decorators
            }).code;
        } catch (e) {
            return e;
        }
    };

    getCookie(cookies, cookie) {
        const c = (cookies || "").split(";").map(i => i.trim()).find(i => i.startsWith(cookie + "="));
        return c ? c.substring(cookie.length + 1) : null;
    };
}

module.exports = API;