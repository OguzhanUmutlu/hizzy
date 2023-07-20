#!/usr/bin/env node

const random = () => crypto.getRandomValues(new Uint32Array([0]))[0].toString(36); // todo: maybe get back to BigUint64?

const self = module.exports = {};
self.defineConfig = r => r;
const sT = Date.now();
global.__sT__ = sT;
global.__PRODUCT__ = "hizzy";
global.__PRODUCT_U__ = "Hizzy";
global.__VERSION__ = require("./package.json").version;
const fs = require("fs");
const dotenv = require("dotenv");
const path = require("path");
const os = require("os");
const url = require("url");
const {argv} = process;
require("fancy-printer").makeGlobal(true);
dotenv.config();
const exit = (...msg) => {
    printer.dev.error(...msg);
    process.exit(1);
};
printer.title(__PRODUCT_U__ + " v" + __VERSION__);

printer.makeGlobal(true).setOptions({
    format: opts => printer.css("color: " + printer.getTag(opts.tag || "log")["c"]) + "  %tag  %time %stack > %text",
    timeBackgroundColor: "",
    timeColor: "",
    stackColor: "",
    filenameColor: "",
    lineColor: "",
    columnColor: "",
    timePadding: 0,
    tagPadding: 0,
    styleSubstitutionsEnabled: true
});
printer.dev = printer.create({
    format: opts => printer.css("color: " + printer.getTag(opts.tag || "log")["c"]) + "  %tag  %text",
    tagPadding: 0, styleSubstitutionsEnabled: true
});
printer.tags = printer.dev.tags = {
    pass: {text: "✓", c: "greenBright", textColor: "green"},
    fail: {text: "X", c: "redBright", textColor: "redBright"},
    error: {text: "", c: "red", textColor: "red"},
    warn: {text: "✩", c: "yellow", textColor: "yellow"},
    info: {text: "?", c: "blueBright", textColor: "blue"},
    debug: {text: "~", c: "gray", textColor: "gray"},
    notice: {text: "!", c: "cyanBright", textColor: "cyan"},
    log: {text: '"', c: "gray", textColor: "white"},
    assert: {text: ">", c: "white", textColor: "gray"}
};
printer.inline.options.format = "%text";
Object.keys(printer.styles).forEach(s => {
    if (s === "t") return;
    delete printer.styles[s];
    delete printer.dev.styles[s];
});
const checkDefault = (obj, def = {}, l = []) => {
    let changed = [];
    for (const key in def) {
        //if (typeof def[key] !== typeof obj[key]) {
        if (typeof obj[key] === "undefined") {
            obj[key] = def[key];
            changed.push([...l, key]);
            continue;
        }
        if (obj[key].constructor === Object && key !== "addons" && key !== "static") {
            const c = checkDefault(obj[key], def[key], [...l, key]);
            changed.push(...c);
        }
    }
    return changed;
};
const propExpect = (prop, expect, got) => exit("The config file %c" + __PRODUCT__ + ".json%c's %c" + prop + "%c property was expected as: %c" + expect + "%c, got:%c", "color: orange", "color: red", "color: orange", "color: red", "color: orange", "color: red", "color: orange", got);
const isTerminal = require.main === module;
if (!isTerminal) exit(__PRODUCT_U__ + "'s module mode has not been developed yet. Its API can still be reached by importing/requiring '" + __PRODUCT__ + "/api'.");
// todo
let dir = process.cwd();
let file;
const args = argv.slice(2).filter(i => !i.startsWith("-"));
const optList = argv.slice(2).filter(i => i.startsWith("-"));
const _argv_ = {};
const shortcuts = {
    "-h": "help",
    "-v": "version",
    "-b": "build",
    "-p": "port",
    "-d": "dev",
    "-o": "open",
    "-c": "config",
    "-f": "force"
};
optList.forEach(i => {
    i = i.toLowerCase();
    if (shortcuts[i]) i = "--" + shortcuts[i];
    const sp = i.substring(2).split("=");
    _argv_[sp[0]] = sp[1] ? sp.slice(1).join("=") || true : true;
});
Object.freeze(_argv_);
self.args = _argv_;
if (isTerminal && _argv_.help) {
    printer.raw.log("%c  " + __PRODUCT_U__ + " v" + __VERSION__, "color: yellow");
    printer.println("");
    printer.raw.log("%c  Usage: " + __PRODUCT__ + " [root]", "color: magenta");
    printer.println("");
    printer.raw.log("%c  Options:", "color: orange");
    printer.raw.log("%c    -h, --help%c               shows this page", "color: green", "color: yellow");
    printer.raw.log("%c    -v, --version%c            shows the version", "color: green", "color: yellow");
    printer.raw.log("%c    --advanced-version%c       shows advanced information", "color: green", "color: yellow");
    printer.raw.log("%c    -b, --build%c              only builds the project and exits", "color: green", "color: yellow");
    printer.raw.log("%c    --host%c                   toggles the view of IPv4", "color: green", "color: yellow");
    printer.raw.log("%c    --config=PATH%c            sets the config file's path", "color: green", "color: yellow");
    printer.raw.log("%c    -p=PORT, --port=PORT%c     sets the port (0 = random)", "color: green", "color: yellow");
    printer.raw.log("%c    -f, --force%c              forces auto build", "color: green", "color: yellow");
    printer.raw.log("%c    -d, --dev%c                enables developer mode", "color: green", "color: yellow");
    printer.raw.log("%c    -o, --open%c               opens the app on start", "color: green", "color: yellow");
    printer.raw.log("%c    --debug%c                  enables debug messages", "color: green", "color: yellow");
    printer.raw.log("%c    --debug-socket%c           sends debug messages of sockets", "color: green", "color: yellow");
    printer.raw.log("%c    --injections%c             builds html/jsx injection files", "color: green", "color: yellow");
    printer.raw.log("%c    --addon-init%c             initializes up an addon environment", "color: green", "color: yellow");
    printer.raw.log("%c    --no-clear%c               disables the initial screen clear", "color: green", "color: yellow");
    process.exit();
}
if (isTerminal && _argv_.version) {
    printer.raw.log(`${__PRODUCT_U__} v${__VERSION__}`);
    process.exit();
}
if (isTerminal && _argv_["advanced-version"]) {
    printer.raw.log(`${__PRODUCT__}: v${__VERSION__}\nnode: ${process.version}\ndevice: ${os.platform()}-${os.arch()}`);
    process.exit();
}
if (isTerminal && _argv_["addon-init"]) {
    const name = args[0] || process.cwd().split(path.sep).slice(-1)[0];
    const folder = path.join(process.cwd(), args[0] || "");
    if (!/^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)) exit("Please select a valid addon name!");
    if (fs.existsSync(folder)) exit("There is already a directory at '%c" + folder + "&t'!", "color: orange");
    fs.mkdirSync(folder);
    fs.writeFileSync(path.join(folder, "index.js"), `const {AddonModule} = Hizzy;
module.exports = class MyAddon extends AddonModule {
    onLoad() {
        this.log("Loaded!");
    };

    onEnable() {
        this.log("Enabled!");
    };

    onDisable(reason) {
        this.log("Disabled for the reason:", reason);
    }

    onClientSideLoad() {
        this.log("Addon has been loaded in client side!");
    };

    onClientSideRendered() {
        this.log("A page has been rendered in the client side!");
    };

    onClientSideError(error) {
        this.log("An error occurred in the client side:", error);
    };
};`);
    fs.writeFileSync(path.join(folder, "package.json"), `{
  "name": ${JSON.stringify(name)},
  "description": "This is an addon!",
  "version": "1.0.0",
  "main": "index.js"
}`);
    printer.dev.pass("A new addon has been set up at '%c" + folder + "&t'!", "color: orange");
    process.exit();
}
if (!_argv_.build && !_argv_["no-clear"]) {
    printer.clear();
    printer.print("\n");
}
if (isTerminal && args[0]) {
    const f = path.join(process.cwd(), args[0]);
    if (!fs.existsSync(f)) exit("Couldn't open the file %c'" + f + "'%c.", "color: orange", "color: red");
    if (fs.statSync(f).isDirectory()) dir = f; else {
        file = f;
        dir = path.dirname(f);
    }
}

(async () => {
    /*async function askLine(
        lineInitial,
        lineWriting,
        lineDone,
        placeholder,
        validator
    ) {
        let firstWrite;
        const k1 = printer.readCustom({
            onKey: k => {
                firstWrite += k;
                k1.end();
            },
            onBackspace: r => r,
            onEnd: () => {
                firstWrite = null;
                k1.end();
            }
        });
        await k1.promise;
        if (firstWrite) {
            const k2 = printer.readCustom();
            printer.stdin.write(firstWrite);
        } else {
            printer.backspace(lineInitial.length);
            return lineDone(placeholder);
        }
    }

    if (!confExists) {
        printer.inline.log("%c?%c Project name: %c» " + __PRODUCT__ + "-project", "color: cyan", "color: whiteBright", "color: gray");
        const line = await askLine(
            "? Project name: » " + __PRODUCT__ + "-project", s => printer.println(),
            __PRODUCT__ + "-project", () => true
        );
        process.exit();
    }*/

    const DEFAULT_CONFIG = {
        "dev": true,
        "port": 1881,
        "fileRefresh": true,
        "autoBuild": true,
        "listen": true,
        "main": "Server.jsx",
        "mainModule": true,
        "checkConfig": true,
        "realtime": true,
        "static": {},
        "https": false,
        "srcFolder": "src",
        "connectionTimeout": 60000,
        "keepaliveTimeout": 30000,
        "clientKeepalive": 20000,
        "minClientKeepalive": 8000,
        "addons": [],
        "includeOriginalInBuild": true,
        "cache": {
            "addons": 0,
            "npm": 0,
            "preact": 0,
            "preact-hooks": 0,
            "static": {}
        }
        // todo: fix cache, it repeatedly refreshes the page for some reason, *sometimes*
    };
    let confFileName = _argv_.config;
    if (confFileName && !fs.existsSync(path.join(dir, confFileName))) return exit("Config file %c" + confFileName + "&t given in the command line arguments is invalid:", "color: orange");
    if (!confFileName) for (const a of ["json", "config.json", "config.ts", "config.js", "config.mts", "config.mjs"]) {
        confFileName = __PRODUCT__ + "." + a;
        if (fs.existsSync(path.join(dir, confFileName))) break;
    }
    const confPath = path.join(dir, confFileName);
    const confExists = fs.existsSync(confPath);
    if (!confExists || !fs.statSync(confPath).isFile()) {
        if (confExists) fs.rmSync(confPath);
        if (_argv_.debug) printer.dev.debug("Creating the %c/" + confFileName + "&t file...", "color: orange");
        fs.writeFileSync(confPath, `export default Hizzy.defineConfig({});`);
    }
    let conf;
    if (confFileName.endsWith(".json")) {
        try {
            conf = JSON.parse(fs.readFileSync(confPath, "utf8"));
        } catch (e) {
            return exit("Invalid JSON in the file %c'" + confPath + "'%c: %c" + e.toString() + "%c.", "color: orange", "color: red", "color: orange", "color: red");
        }
    } else if (confFileName.endsWith(".js") || confFileName.endsWith(".mjs") || confFileName.endsWith(".ts") || confFileName.endsWith(".mts")) {
        // noinspection JSValidateTypes
        global[__PRODUCT_U__] = {defineConfig: r => r};
        if (confFileName.endsWith(".js") || confFileName.endsWith(".mjs")) {
            conf = (await import(url.pathToFileURL(confPath))).default;
        } else {
            const filePath = path.join(path.dirname(confPath), random() + "." + (confFileName.endsWith(".mjs") ? "m" : "") + "js");
            fs.writeFileSync(filePath, require("@babel/core").transformSync(fs.readFileSync(confPath), {
                filename: path.basename(confPath),
                presets: [require("@babel/preset-typescript")]
            }).code);
            try {
                conf = (await import(url.pathToFileURL(confPath))).default;
            } finally {
                fs.rmSync(filePath);
            }
        }
    }
    if (typeof conf === "function") await conf({argv: _argv_, isDev: _argv_.dev});
    const ch = conf.checkConfig;
    const changedKeys = checkDefault(conf, DEFAULT_CONFIG);
    if (!_argv_.build && changedKeys.length && ch && confFileName.endsWith(".json")) {
        fs.writeFileSync(confPath, JSON.stringify(conf, null, 2));
        printer.dev.warn("Updated following properties in " + __PRODUCT__ + ".json: " + changedKeys.map(i => i.join("->")).join(", "));
    }
    if (!Array.isArray(conf.extensionRemovals)) conf.extensionRemovals = DEFAULT_CONFIG.extensionRemovals;
    conf.extensionRemovals = [...new Set(conf.extensionRemovals)];
    if (conf.keepaliveTimeout !== -1 && conf.clientKeepalive >= conf.keepaliveTimeout) return exit("Config's 'clientKeepalive' property has to be smaller than 'keepaliveTimeout'.");
    if (Array.isArray(conf.static)) {
        const arr = conf.static;
        conf.static = {};
        for (const i of arr) conf.static[i] = i;
    }
    Object.freeze(conf);
    self.config = conf;

    if (!_argv_.debug) {
        printer.options.disabledTags.push("debug");
        printer.dev.options.disabledTags.push("debug");
    }
    const hasBuilt = fs.existsSync(path.join(dir, ".build"));
    const srcPath = path.join(dir, conf.srcFolder);
    let srcExists = fs.existsSync(srcPath);
    if (!srcExists || !fs.statSync(srcPath).isDirectory()) {
        if (!hasBuilt) {
            if (srcExists) fs.rmSync(srcPath);
            printer.dev.debug("Creating the %c/" + conf.srcFolder + "&t folder...", "color: orange");
            fs.mkdirSync(srcPath);
            fs.writeFileSync(path.join(srcPath, "App.jsx"), `const foo = 20;\nexport default <div>Hello, world! { foo * 2 }</div>`);
        } else printer.dev.debug("Skipping the creation of %c/" + conf.srcFolder + "&t because there is an existing build.", "color: orange");
    }
    self.config = conf;
    const apiPath = path.join(__dirname, "api.js");
    const apiMinPath = path.join(__dirname, "api.min.js");
    global[__PRODUCT_U__] = new (require(fs.existsSync(apiPath) ? apiPath : apiMinPath))(dir);
    if (conf.fileRefresh) Hizzy.autoRefresh = true;
    const mainPath = path.join(dir, conf.srcFolder, conf.main);
    const mainExtension = path.extname(mainPath);
    if (!fs.existsSync(mainPath)) {
        printer.dev.debug("Creating the %c/src/" + conf.main + "&t file...", "color: orange");
        fs.writeFileSync(mainPath, {
            ".jsx": `export default <Routes>
    <Route path="/" route="./App.jsx"/>
</Routes>;`
        }[mainExtension]);
    }
    if (_argv_.build) {
        _argv_["just-build"] = true;
        Hizzy.build().then(() => process.exit());
    } else {
        const type = r => {
            if (r === null) return "null";
            if (r && r.constructor === Array) return "array";
            return typeof r;
        };
        if (typeof conf.addons === "object") {
            if (Object.keys(conf.addons).length > 0) {
                let addons = conf.addons;
                if (Array.isArray(addons)) {
                    for (let i = 0; i < addons.length; i++) {
                        const pl = addons[i];
                        if (typeof pl === "string") await Hizzy.Addon.create(pl, {});
                        else if (Array.isArray(pl)) {
                            if (pl[1] && pl[1].constructor !== Object) return exit("Config's 'conf.addons[" + i + "][1]' property should be an object or empty, got: " + type(pl[1]));
                            await Hizzy.Addon.create(pl[0], pl[1]);
                        } else return exit("Config's 'conf.addons[" + i + "]' property should either be an array or a string, got: " + type(k));
                    }
                } else for (const k in addons) {
                    if (addons[k].constructor !== Object) return exit("Config's 'conf.addons[" + k + "] property should be an object, got: " + type(addons[k]));
                    await Hizzy.Addon.create(k, addons[k]);
                }
            }
        } else return exit("Config's 'conf.addons' property has to be an object or an array, got: " + type(conf.addons) + ".");
        await Hizzy.init();
        if (_argv_.dev || conf.dev) {
            Hizzy.dev = true;
            await Hizzy.processMain(Hizzy.jsxToJS(fs.readFileSync(mainPath), mainExtension));
        }
        if (conf.realtime) Hizzy.enableRealtime();
        if (Hizzy.dev) {
            if (conf.listen) Hizzy.listen().then(r => r);
        } else {
            if (_argv_.build || conf.autoBuild || _argv_.force) Hizzy.build().then(r => r);
            else if (conf.listen) Hizzy.scanBuild().then(r => r);
        }
    }
})(); // todo: when importing html from a jsx, convert it to react document