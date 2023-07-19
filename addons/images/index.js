const sharp = require("sharp");
const {AddonModule} = Hizzy;

throw new Error("Not done."); // todo

const resizeImage = async (file, buffer, width, height) => {
    if (!(buffer instanceof Buffer)) return null;
    width *= 1;
    height *= 1;
    if (!width && !height) return null;
    const img = sharp(buffer);
    if (!width || !height) {
        const {width: w, height: h} = await img.metadata();
        if (!width) {
            if (width === (width = w / h * height)) return null;
        } else if (height === (height = h / w * width)) return null;
    }
    await img.resize({width, height});
    return await img.toBuffer();
};

/*

Resizing the hizzy icon takes around 6ms!

const imageHandler = async (file, get, set, zip, ext, pt) => {
    zip.file("blur/" + pt.map(i => i + "/").join("") + file, resizeImage(file, get, 100));
};
const scanImageHandler = async () => {

};*/

module.exports = class ImagePlusAddon extends AddonModule {
    #blurCache = {};
    #cb;

    /*onLoad() {
        Hizzy.buildHandlers.jpeg = Hizzy.buildHandlers.jpg = Hizzy.buildHandlers.png =
            Hizzy.buildHandlers.webp = Hizzy.buildHandlers.gif = Hizzy.buildHandlers.jpeg = [imageHandler];
        Hizzy.scanHandlers.blur = {
            __default__: [scanImageHandler]
        };
    };*/

    onLoad() {
        const types = ["jpeg", "jpg", "png", "webp", "gif"];
        this.#cb = async (file, content, req, res) => {
            if (!req.query["__blur__"]) return;
            const spl = file.split(".");
            if (types.includes(spl[spl.length - 1])) {
                try {
                    const {__blur__width__: w, __blur__height__: h} = req.query;
                    const k = file + "\x00" + w + "\x00" + h;
                    const buff = this.#blurCache[k] = this.#blurCache[k] || await resizeImage(file, content, w, h);
                    if (!buff) return;
                    Hizzy.sendRawFile(file, buff, req, res, true);
                } catch (e) {
                    printer.dev.error(e)
                    res.json({error: "Internal server error"});
                }
            }
        };
    };

    onEnable() {
        Hizzy.preRawSend.push(this.#cb);
        this.onClientSideLoad = () => {
            return function (props) {
                props = props || {};
                const src = props.src || "";
                const {width, height, actualWidth, actualHeight} = props;
                return Hizzy.createElement("div", {
                    children: [
                        Hizzy.createElement("img", {
                            src: `${props.src}${src.includes("?") ? "" : "?"}&__blur__=1&__blur__width__=${width || 100}&__blur__height=${height || 100}`,
                            width: actualWidth, height: actualHeight,
                            style: `filter: blur(${props.blur || "5px"})`
                        }),
                        Hizzy.createElement("img", {src: props.src, width: actualWidth, height: actualHeight})
                    ]
                });
            };
        };
    };

    onDisable(reason) {
        Hizzy.preRawSend.splice(Hizzy.preRequests.indexOf(this.#cb), 1);
    };
};