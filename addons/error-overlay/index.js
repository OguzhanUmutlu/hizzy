const fs = require("fs");
const path = require("path");
const {AddonModule} = Hizzy;

throw new Error("Not done."); // todo

module.exports = new class ErrorOverlayAddon extends AddonModule {
    #css = "";

    onEnable() {
        this.#css = JSON.stringify(fs.readFileSync(path.join(__dirname, "overlay.css"), "utf8"));
        this.onClientSideRendered = (() => {
            const mainStyle = document.createElement("style");
            mainStyle.textContent = $CSS.replaceAll("\n", "").replaceAll(" ", "").replaceAll("_RUNTIME_", R);
            document.head.appendChild(mainStyle);
            const hizzyOverlay = document.createElement("div");
            hizzyOverlay.classList.add("hizzy-overlay" + R);
        }).toString().replace("$CSS", this.#css);
    };

    onClientSideError(error) {
        const element = document.querySelector(".hizzy-overlay" + R);
        element.innerHTML = error.toString();
        document.body.appendChild(element);
    }
};