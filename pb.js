const u = require("uglify-js");
const fs = require("fs");
const files = [
    "./api.js",
    "./hizzy.js"
];

// steps of publish:
// node pb
// node hizzy --injections (exit after injection build being completed)
// cd addons && cd api && npm publish && cd ../authentication && npm publish && cd ../database && npm publish && cd ../error-overlay && npm publish && cd ../helmet && npm publish && cd ../images && npm publish && cd ../language && npm publish && cd ../requests && npm publish
// npm publish

files.forEach(i => {
    if (i.endsWith(".js")) {
        const min = u.minify(fs.readFileSync(i, "utf8"));
        if (!min.code) throw min;
        fs.writeFileSync(i.replace(".js", ".min.js"), min.code);
    }
});