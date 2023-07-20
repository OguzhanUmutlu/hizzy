const [R, TIMEOUT] = $$CONF$$;
let onHizzy;
window.__HIZZY__ = new Promise(r => onHizzy = r);
const {CLIENT2SERVER, SERVER2CLIENT} = {
    CLIENT2SERVER: {
        HANDSHAKE_RESPONSE: "0", // agreed on shaking the hand
        KEEPALIVE: "3" // keep alive packet
    },
    SERVER2CLIENT: {
        FILE_REFRESH: "0", // requests to refresh the page, so it can load the new contents
        HANDSHAKE_REQUESTED: "1", // requests handshake
        SURE_HANDSHAKE: "4" // server agreed on shaking the hand as well, what a friendship!
    }
};
const w = window;
const d = document;
delete w["cookieStore"];
d.querySelector("script[data-rm='" + R + "']").remove();
const isSecure = location.protocol === "https:";
const worker = new Worker(URL.createObjectURL(new Blob(["(" + (() => {
    let socket = new WebSocket("$R");
    const TIMEOUT = $T;
    const aE = "addEventListener";
    socket[aE]("open", () => {
        if (TIMEOUT > 0) setInterval(() => socket.send("$P"), TIMEOUT);
    });
    socket[aE]("close", () => postMessage(JSON.stringify({event: "close"})));
    socket[aE]("error", () => postMessage(JSON.stringify({event: "error"})));
    socket[aE]("message", e => postMessage(JSON.stringify({event: "message", data: e.data})))
    addEventListener("message", e => socket.send(e.data));
}).toString()
    .replace("$R", "ws" + (isSecure ? "s" : "") + "://" + location.host)
    .replace("$P", CLIENT2SERVER.KEEPALIVE)
    .replace("$T", TIMEOUT)
+ ")()"])));
const sendSocket = content => worker.postMessage(content);
worker.addEventListener("message", async event => {
    const E = JSON.parse(event.data);
    ["close", "error"].includes(E.event) && location.reload();
    let m = E.data.toString();
    if (m[0] === SERVER2CLIENT.FILE_REFRESH) location.reload(); // todo: make it not refresh the actual page
    if (m[0] === SERVER2CLIENT.HANDSHAKE_REQUESTED) onHandshook();
    if (m[0] === SERVER2CLIENT.SURE_HANDSHAKE) onHandshookSure();
});
let onHandshook;
let onHandshookSure;
const handshookPromise = new Promise(r => onHandshook = r);
const handshookSurePromise = new Promise(r => onHandshookSure = r);
const loadPromise = new Promise(r => addEventListener("load", r));
await handshookPromise;
if (document.readyState !== "complete") await loadPromise;
sendSocket(CLIENT2SERVER.HANDSHAKE_RESPONSE);
await handshookSurePromise;
onHizzy();