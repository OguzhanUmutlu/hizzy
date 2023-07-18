const fs = require("fs");
const path = require("path");
const {AddonModule} = Hizzy;
module.exports = class LanguageAddon extends AddonModule {
    onEnable() {
        const directory = this.options.directory;
        if (typeof directory !== "string" || !fs.existsSync(path.join(Hizzy.directory, directory)) || !fs.statSync(path.join(Hizzy.directory, directory)).isDirectory()) {
            return this.disable("not having a valid 'directory' property as a directory path in the 'hizzy-language' configuration.");
        }
        const container = {};
        fs.readdirSync(path.join(Hizzy.directory, directory)).forEach(i => {
            if (!i.endsWith(".json")) return;
            const n = i.split(".")[0];
            container[n] = JSON.parse(fs.readFileSync(path.join(Hizzy.directory, directory, i), "utf8"));
        });
        if (!Object.keys(container).length) return;
        this.onClientSideLoad = (() => {
            const [def, container] = $conf;
            let lang = (document.cookie.split(";").find(i => i.trim().startsWith("__hizzy__lang__=")) || "__hizzy__lang__=" + def).trim().substring("__hizzy__lang__=".length);
            const hooks = [];
            Object.freeze(container);

            function Lang(props = {}) {
                const [g, s] = Hizzy.useState("");
                const k = typeof props.children === "string" ? props.children : "";
                s(container[lang][k] || "");
                hooks.push([s, k]);
                return Hizzy.createElement("span", null, g);
            }

            Object.defineProperties(Lang, {
                language: {
                    get: () => lang,
                    set: s => {
                        if (!container[lang]) throw new Error("@hizzyjs/language: Invalid language: " + lang);
                        lang = s;
                        hooks.forEach(([s, k]) => s(container[lang][k] || ""));
                    }
                },
                languages: {
                    get: () => Object.keys(container)
                },
                container: {
                    get: () => ({...container})
                },
                next: {
                    get: () => {
                        const L = Object.keys(container);
                        let index = L.indexOf(lang);
                        if (index === -1) throw new Error("@hizzyjs/language: Invalid language!");
                        if (index === L.length - 1) index = -1;
                        return L[index + 1];
                    }
                }
            });
            return Lang;
        }).toString()
            .replace("$conf", JSON.stringify([
                this.options.default || Object.keys(container)[0],
                container
            ]));
    };
};