const fs = require("fs");
const {exec} = require("child_process");

const run = command => new Promise(r => {
    const proc = exec(command);
    proc.stdout.on("data", chunk => process.stdout.write(chunk));
    proc.on("exit", r);
    proc.on("disconnect", r);
});

(async () => {
    let printer;
    const request = async () => process.argv.includes("--yes-all") || (await printer.readLine()).toLowerCase() === "y";
    if (!fs.existsSync("node_modules")) await run("npm install");
    else {
        printer = require("fancy-printer");
        process.stdout.write("Want to update dependencies? (y/n) ");
        if (await request()) await run("npm install");
    }
    printer = require("fancy-printer");
    if (fs.existsSync("./package-lock.json")) fs.rmSync("./package-lock.json");
    const files = [
        "./api.js",
        "./hizzy.js"
    ];
    // steps of publish:
    // node pb
    // node hizzy --injections (exit after injection build being completed)
    // npm publish
    files.forEach(i => {
        if (i.endsWith(".js")) {
            const min = require("uglify-js").minify(fs.readFileSync(i, "utf8"));
            if (!min.code) throw min;
            fs.writeFileSync(i.replace(".js", ".min.js"), min.code);
        }
    });

    printer.dev = printer;
    global.__PRODUCT__ = "hizzy";
    global.__PRODUCT_U__ = "Hizzy";
    global.__VERSION__ = require("./package.json").version;
    require("./api");

    process.stdout.write("Want to publish addons? (y/n) ");
    if (await request()) {
        for (const f of fs.readdirSync("./addons")) {
            process.stdout.write("Want to publish the addon at '/addons/" + f + "'? (y/n) ");
            if (await request()) await run("cd ./addons/" + f + " && npm publish --access public");
        }
    }
    process.stdout.write("Want to publish the package? (y/n) ");
    if (await request()) await run("npm publish --access public");
})();