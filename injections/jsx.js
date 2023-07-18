// noinspection TypeScriptUMDGlobal


(async () => {
    Object.defineProperty(window, "_eval_", {
        get: () => (..._$$R$$) => {
            return eval(_$$R$$[0]); // runs with arguments
        }
    });
    Object.freeze(window.eval);
    Object.freeze(window._eval_);
})();
(async () => {
    const [R, R2, T, TIMEOUT, mainFileI, filesI, DEV, EXP, STATIC] = $$CONF$$;
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
    const w = window;
    const d = document;
    const o = Object;
    const define = "defineProperty";
    delete w["cookieStore"];
    d.querySelector("script[data-rm='" + R + "']").remove();
    const key = (document.cookie.split(';').map(i => i.trim()).find(i => i.startsWith("__hizzy__=")) || "").substring("__hizzy__=".length);
    if (!key) location.reload();
    const isSecure = location.protocol === "https:";
    const worker = new Worker(URL.createObjectURL(new Blob(["(" + (() => {
        let socket = new WebSocket("$R");
        const TIMEOUT = $T;
        socket.addEventListener("open", () => {
            if (TIMEOUT > 0) setInterval(() => socket.send("$P"), TIMEOUT);
        });
        socket.addEventListener("close", () => postMessage(JSON.stringify({event: "close"})));
        socket.addEventListener("error", () => postMessage(JSON.stringify({event: "error"})));
        socket.addEventListener("message", e => postMessage(JSON.stringify({event: "message", data: e.data})))
        addEventListener("message", e => socket.send(e.data));
    }).toString()
        .replace("$R", "ws" + (isSecure ? "s" : "") + "://" + location.host)
        .replace("$P", CLIENT2SERVER.KEEPALIVE)
        .replace("$T", TIMEOUT)
    + ")()"])));
    const sendToSocket = content => worker.postMessage(content);
    let onRender;
    let renderPromise = new Promise(r => onRender = r);
    let firstRender = true;
    worker.addEventListener("message", async event => {
        const E = JSON.parse(event.data);
        switch (E.event) {
            case "close":
            case "error":
                location.reload();
                break;
            case "message":
                let m = E.data.toString();
                if (m[0] === SERVER2CLIENT.FILE_REFRESH) {
                    pageCache = {};
                    await reloadPage();
                }
                if (m[0] === SERVER2CLIENT.HANDSHAKE_REQUESTED) onHandshook();
                if (m[0] === SERVER2CLIENT.CLIENT_FUNCTION_REQUEST) {
                    await renderPromise;
                    const spl = m.substring(1).split(":");
                    const id = spl[0];
                    const code = spl.slice(1).join(":");
                    try {
                        const res = runCode(code, [
                            [`__hizzy_run${R}__`, clientFunctions]
                        ]);
                        sendToSocket(CLIENT2SERVER.CLIENT_FUNCTION_RESPONSE + "0" + id + ":" + JSON.stringify(res));
                    } catch (e) {
                        console.error(e);
                        sendToSocket(CLIENT2SERVER.CLIENT_FUNCTION_RESPONSE + "1" + id + ":" + e.message);
                    }
                }
                if (m[0] === SERVER2CLIENT.SERVER_FUNCTION_RESPONSE) {
                    const spl = m.substring(1).split(":");
                    const evalId = spl[0];
                    const res = spl.slice(1).join(":");
                    evalResponses[evalId](res === "undefined" ? undefined : JSON.parse(res));
                }
                if (m[0] === SERVER2CLIENT.SURE_HANDSHAKE) onHandshookSure();
                break;
        }
    });
    let onHandshook;
    let onHandshookSure;
    const handshookPromise = new Promise(r => onHandshook = r);
    const handshookSurePromise = new Promise(r => onHandshookSure = r);
    let loadPromise = new Promise(r => addEventListener("load", r));
    let clientFunctions = {};
    let _evalId = 0;
    const evalResponses = {};
    const runCode = (code, args = [], async = false) => {
        return _eval_("(" + (async ? "async" : "") + "()=>{" + `${args.map((i, j) => `const ${i[0]}=_${R}[${j + 1}];`).join("")}${code}` + "})", ...args.map(i => i[1]))();
    };
    const runModuleCode = code => import(URL.createObjectURL(new Blob([code], {type: "application/javascript"})));
    await handshookPromise;
    await loadPromise;
    sendToSocket(CLIENT2SERVER.HANDSHAKE_RESPONSE);

    ///
    let mainFile = mainFileI;
    let files = filesI;
    let exports = {};
    let hasExported = [];
    ///

    await handshookSurePromise;
    const Hizzy = {};
    const __hooks = await import("http" + (isSecure ? "s" : "") + "://" + location.host + "/__hizzy__preact__hooks__?" + EXP);
    const __react = __hooks["React"];
    if (!__react) location.reload();
    const react = __react;
    Object.assign(Hizzy, __react, __hooks);
    const ADDONS = await (await fetch("/__hizzy__addons__")).json();
    d.cookie = "__hizzy__=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    const pathJoin = (f, cd = mainFile.split("/").slice(0, -1)) => {
        const p = [...cd];
        for (const i of f.split("/")) {
            if (i === "." || !i) continue;
            if (i === "..") {
                p.pop();
                continue;
            }
            p.push(i);
        }
        return p.join("/");
    };
    const fileHandlers = {
        build: {
            html: (name, content) => {
                exports[name] = {default: new DOMParser().parseFromString(content, "text/html")};
                hasExported.push(name);
                return exports[name];
            },
            css: (name, content) => {
                const style = document.createElement("style");
                style.innerHTML = content;
                document.head.appendChild(style);
                exports[name] = {default: style};
                hasExported.push(name);
                return exports[name];
            },
            js: async (name, content) => {
                exports[name] = {default: await runCode(content, [], true)};
                hasExported.push(name);
                return exports[name];
            }
        },
        external: {
            html: (name, content) => ({default: new DOMParser().parseFromString(content, "text/html")}),
            css: (name, content) => {
                let st = document.createElement("style");
                st.innerHTML = content;
                document.head.appendChild(st);
                return {default: st};
            },
            js: (name, content) => runModuleCode(content),
            json: (name, content) => ({default: JSON.parse(content)})
        }
    };
    Hizzy.resolvePath = p => {
        p = pathJoin(p);
        for (const folder in STATIC) {
            const show = STATIC[folder];
            const st = pathJoin(folder, []).replaceAll("\\", "/") + "/";
            if (!p.startsWith(st)) continue;
            return show + "/" + p.substring(st.length);
        }
        return p;
    };
    const import_ = async (f, _from, extra = []) => {
        if (f === "hizzy") return Hizzy;
        if (f === "react") return react;
        if (f === "preact") return react;
        if (f === "hooks") return __hooks;
        if (addonExports[f]) return {default: addonExports[f]};
        const relativeP = f.startsWith(".");
        const path = pathJoin(f);
        const file = files[path] || files[path + ".jsx"] || files[path + ".tsx"];
        const fName = files[path] ? path : (files[path + ".jsx"] ? path + ".jsx" : path + ".tsx");
        const _fExtSpl = fName.split(".");
        const fExt = _fExtSpl.length <= 1 ? "" : _fExtSpl[_fExtSpl.length - 1];
        if (hasExported.includes(fName)) return exports[fName];
        if (fExt !== "jsx" && fExt !== "tsx" && file) {
            const fH = fileHandlers.build[fExt];
            if (fH) {
                hasExported.push(fName);
                return exports[fName] = await fH(fName, file);
            }
            return {default: Hizzy.resolvePath(f)};
        }
        if (typeof file === "undefined") {
            if (f.startsWith("https://") || f.startsWith("http://")) {
                const fH = fileHandlers.external[fExt];
                if (fH) {
                    hasExported.push(fName);
                    return exports[fName] = await fH(fName, await (await fetch(f)).text());
                }
                return {default: Hizzy.resolvePath(f)};
            } else if (["html", "css", "js"].includes(fExt)) {
                d.cookie = "__hizzy__=" + key;
                const a = await import("http" + (isSecure ? "s" : "") + "://" + location.host + "/" + (relativeP ? path : "__hizzy__import__/" + path));
                d.cookie = "__hizzy__=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                return a;
            } else return {default: Hizzy.resolvePath(f)};
        }
        const getting = {load: {}, normal: {}};
        await runCode(file.code + `${file.client.map(i => `__hizzy_get${R}__.normal.${i}=typeof ${i}!="undefined"?${i}:void 0;`).join("")}${file.clientLoad.map(i => `__hizzy_get${R}__.load.${i}=${i};`).join("")}`, [
            ["R" + R2, (...a) => react.createElement(...a)],
            ["F" + R2, (...a) => react.Fragment(...a)],
            ["H" + R2, Hizzy],
            ["currentWebSocket", WebSocket],
            ["FN" + R2, s => (...a) => runServerFunction(fName, s, a)],
            ...(f === mainFile ? [["__hizzy_get" + R + "__", getting]] : []),
            ...extra
        ], true);
        clientFunctions[fName] = getting;
        hasExported.push(fName);
        return exports[fName];
    };
    o[define](Hizzy, "E" + R2, {get: () => exports});
    o[define](Hizzy, "I" + R2, {get: () => (a, b) => import_(a, b)});
    for (const f in files) exports[f] = {};
    const runServerFunction = (page, func, args) => {
        const id = ++_evalId;
        sendToSocket(CLIENT2SERVER.SERVER_FUNCTION_REQUEST + "" + id + ":" + page + ":" + func + ":" + JSON.stringify(args));
        if (files[page].respondFunctions.includes(func)) return new Promise(r => evalResponses[id] = r);
    };
// todo: client can create workers, they should be terminated before a navigation, also assignments to `window` or any other global variable stay
    const addonExports = {};
// BEFORE LOAD:
    const doAddon = async (index, ...a) => {
        for (let i = 0; i < ADDONS.length; i++) {
            const addon = ADDONS[i];
            const f = addon[index];
            if (!f) continue;
            const fn = await eval(f);
            const v = fn(...a);
            if (index === 1) addonExports[addon[0]] = v;
        }
    };
    Hizzy.useAddon = s => addonExports[s] || {};
    await doAddon(1); // on client side load
    const _setInterval = window.setInterval;
    const _setTimeout = window.setTimeout;
    let timeouts = [];
    window.setTimeout = (f, t) => {
        const id = _setTimeout(f, t);
        timeouts.push(id);
        return id;
    };
    window.setInterval = (f, t) => {
        const id = _setInterval(f, t);
        timeouts.push(id);
        return id;
    };
    let pageCache = {
        [location.pathname]: {mainFile, files}
    };
    const fetchPage = async (p, push = true) => {
        p = pathJoin(p, location.pathname.split("/").slice(1, -1));
        const actual = p.split("#")[0].split("?")[0];
        d.cookie = "__hizzy__=" + key;
        if (pageCache[actual]) {
            const page = pageCache[actual];
            mainFile = page.mainFile;
            files = page.files;
            await fetch("/" + p, {
                headers: {
                    "hizzy-dest": "script",
                    "hizzy-cache": "yes"
                }
            });
        } else {
            const spl = (await (await fetch("/" + p + "", {
                headers: {
                    "hizzy-dest": "script"
                }
            })).text()).split("\u0000");
            mainFile = JSON.parse(spl[0]);
            files = JSON.parse(spl.slice(1).join("\u0000"));
        }
        d.cookie = "__hizzy__=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        exports = {};
        hasExported = [];
        for (const f in files) exports[f] = {};
        pageCache[actual] = {mainFile, files};
        if (push) history.pushState({
            ["__hizzy" + R + "__"]: p
        }, null, "/" + p);
        await loadPage(mainFile);
    };
    const reloadPage = () => fetchPage(location.pathname);
    Hizzy.openPage = p => fetchPage(p);
    Hizzy.reloadPage = () => reloadPage();
    Hizzy.LinkComponent = props => {
        if (!props) props = {};
        const url = props.path || "";
        delete props.path;
        return react.createElement("span", {
            onClick: () => fetchPage(url),
            className: "Link",
            ...props
        }, props.children);
    };
    addEventListener("popstate", async e => {
        await fetchPage(e.state["__hizzy" + R + "__"], false);
    });
    const loadPage = async file => {
        if (!firstRender) renderPromise = new Promise(r => onRender = r);
        firstRender = false;
        d.documentElement.innerHTML = "";
        for (const t of timeouts) clearTimeout(t);
        timeouts = [];
        try {
            const exp = await import_(file, null);
            if (exp && exp.default) {
                let def = exp.default;
                if (typeof def === "function") def = react.h(def, null);
                if (def.__v) {
                    react.render(def, d.body);
                    const l = clientFunctions[file].load;
                    for (const i in l) l[i]();
                }
            }
        } catch (e) {
            console.error(e);
            await doAddon(3, e); // on client side error
        }
        await doAddon(2); // on client side rendered
        onRender();
    };
// LOADING THE ACTUAL PAGE:
    await loadPage(mainFile);
})
();