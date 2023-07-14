const u = require("uglify-js");
const fs = require("fs");
const files = [
    "./api.js",
    "./hizzy.js"
];

files.forEach(i => {
    if (i.endsWith(".js")) {
        const min = u.minify(fs.readFileSync(i, "utf8"));
        if(!min.code) throw min;
        fs.writeFileSync(i.replace(".js", ".min.js"), min.code);
    }
});