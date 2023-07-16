// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols

const fs = require("fs");
const path = require("path");
const {AddonModule} = Hizzy;

const expect = (e, n, g) => {
    throw new Error("Expected a " + e + " for the '" + n + "' argument, got: " + g);
};
const type = (s, exp, name) => {
    if (typeof s !== exp) expect(exp, name, typeof s);
};
const typeNot = (s, exp, name) => {
    if (typeof s === exp) expect("non-" + exp, name, typeof s);
};
const typeLs = (s, exps, name) => {
    for (const exp of exps) if (typeof s === exp) return;
    throw expect(exps.join(" or "), name, typeof s);
};
const JSONLegacy = JSON;

const nested = (c, updated, SPL, key, d = true) => {
    const spl = key.split(SPL);
    for (let i = 0; i < spl.length - 1; i++) {
        if (typeof c !== "object") throw new Error("Cannot set properties of a non-object at: " + key);
        if (!(spl[i] in c)) {
            c[spl[i]] = {};
            updated[0] = true;
        }
        c = c[spl[i]];
    }
    const k = spl[spl.length - 1];
    if (d && typeof c !== "object") throw new Error("Cannot set properties of a non-object at: " + key);
    return [c, k, typeof c === "object" ? c[k] : undefined];
};

class KeyDatabase {
    __file;
    __json = {};
    __updated = false;
    __interval;

    set(key, value) {
        key += "";
        typeLs(value, ["string", "number", "object", "undefined"]);
        if (this.__json[key] === value) return this;
        this.__json[key] = value;
        this.__updated = true;
        return this;
    };

    get(key) {
        key += "";
        return this.__json[key];
    };

    has(key) {
        key += "";
        return key in this.__json;
    };

    push(key, value) {
        typeLs(value, ["string", "number", "object", "undefined"]);
        if (typeof this.__json[key] !== "object" || !Array.isArray(this.__json[key])) throw new Error("Cannot push an element to a non-array at: " + key);
        this.__json[key].push(value);
        this.__updated = true;
        return this;
    };

    add(key, value = 1) {
        type(value, "number", "value");
        if (isNaN(value)) expect("value", "number", "NaN");
        if (typeof this.__json[key] !== "number") throw new Error("Cannot add to a non-number at: " + key);
        this.__json[key] += value;
        this.__updated = true;
        return this;
    };

    subtract(key, value = 1) {
        return this.add(key, -value);
    };

    get isDestroyed() {
        return !!this.__interval;
    };

    destroy() {
        if (!this.__interval) return;
        clearInterval(this.__interval);
    };
}

class NestedKeyDatabase {
    __file;
    __json = {};
    __updated = false;
    __interval;
    NESTED_SPL = ".";

    __nested(key, d = true) {
        const h = [];
        const k = nested(this.__json, h, this.NESTED_SPL, key, d);
        if (h[0]) this.__updated = true;
        return k;
    };

    set(key, value) {
        typeLs(value, ["string", "number", "object", "undefined"]);
        const [a, b] = this.__nested(key + "");
        if (a[b] === value) return this;
        a[b] = value;
        this.__updated = true;
        return this;
    };

    get(key) {
        return this.__nested(key + "")[2];
    };

    has(key) {
        const [a, b] = this.__nested(key + "", false);
        return b in a;
    };

    push(key, value) {
        typeLs(value, ["string", "number", "object", "undefined"]);
        const [a, b] = this.__nested(key + "", false);
        if (!(b in a)) {
            this.__updated = true;
            a[b] = [value];
            return this;
        }
        if (typeof a[b] !== "object" || !Array.isArray(a[b])) throw new Error("Cannot push an element to a non-array at: " + key);
        a[b].push(value);
        this.__updated = true;
        return this;
    };

    add(key, value = 1) {
        type(value, "number", "value");
        if (isNaN(value)) expect("value", "number", "NaN");
        const [a, b] = this.__nested(key + "", false);
        if (!(b in a)) {
            a[b] = value;
            this.__updated = true;
            return this;
        }
        if (typeof a[b] !== "number") throw new Error("Cannot add to a non-number at: " + key);
        a[b] += value;
        this.__updated = true;
        return this;
    };

    subtract(key, value = 1) {
        return this.add(key, -value);
    };

    get isDestroyed() {
        return !!this.__interval;
    };

    destroy() {
        if (!this.__interval) return;
        clearInterval(this.__interval);
    };
}

const initFileDB = (self, file, init, def) => {
    type(file, "string", "file");
    file = path.join(Hizzy.directory, file);
    self.__file = file;
    if (init) {
        type(init, "object", "init");
        self.__json = init;
        return;
    }
    if (!fs.existsSync(file)) fs.writeFileSync(file, def);
    else self.__json = self.parse(fs.readFileSync(file, "utf8"));
    self.__interval = setInterval(() => self.save());
};

class JSONDatabase extends KeyDatabase {
    JSON_SPACE = null;

    constructor(file = "./data.json", init) {
        super();
        initFileDB(this, file, init, "{}");
    };

    save() {
        if (!this.__updated) return this;
        this.__updated = false;
        fs.writeFileSync(this.__file, this.stringify(this.__json, this.JSON_SPACE));
        return this;
    };

    clone() {
        return new JSONDatabase(this.__file, this.__json);
    };

    asNested() {
        return new NestedJSONDatabase(this.__file, this.__json);
    };

    static stringify(json, space) {
        // noinspection JSCheckFunctionSignatures
        return JSONLegacy.stringify(json, null, space);
    };

    static parse(text) {
        return JSONLegacy.parse(text);
    };
}

class NestedJSONDatabase extends NestedKeyDatabase {
    JSON_SPACE = null;

    constructor(file = "./data.json", init) {
        super();
        initFileDB(this, file, init, "{}");
    };

    save() {
        if (!this.__updated) return this;
        this.__updated = false;
        fs.writeFileSync(this.__file, this.stringify(this.__json, this.JSON_SPACE));
        return this;
    };

    clone() {
        return new NestedJSONDatabase(this.__file, this.__json);
    };

    asNotNested() {
        return new JSONDatabase(this.__file, this.__json);
    };

    static stringify(json, space) {
        // noinspection JSCheckFunctionSignatures
        return JSONLegacy.stringify(json, null, space);
    };

    static parse(text) {
        return JSONLegacy.parse(text);
    };
}

class YAMLDatabase extends KeyDatabase {
    constructor(file = "./data.yaml", init) {
        super();
        initFileDB(this, file, init, "");
    };

    save() {
        if (!this.__updated) return this;
        this.__updated = false;
        fs.writeFileSync(this.__file, this.stringify(this.__json));
        return this;
    };

    clone() {
        return new YAMLDatabase(this.__file, this.__json);
    };

    asNested() {
        return new NestedYAMLDatabase(this.__file, this.__json);
    };

    get isDestroyed() {
        return !!this.__interval;
    };

    destroy() {
        if (!this.__interval) return;
        clearInterval(this.__interval);
    };

    static stringify(json) {
        return require("yaml").stringify(json);
    };

    static parse(text) {
        return require("yaml").parse(text);
    };
}

class NestedYAMLDatabase extends NestedKeyDatabase {
    constructor(file = "./data.yaml", init) {
        super();
        initFileDB(this, file, init, "");
    };

    save() {
        if (!this.__updated) return this;
        this.__updated = false;
        fs.writeFileSync(this.__file, this.stringify(this.__json));
        return this;
    };

    clone() {
        return new NestedYAMLDatabase(this.__file, this.__json);
    };

    asNotNested() {
        return new YAMLDatabase(this.__file, this.__json);
    };

    static stringify(json) {
        return require("yaml").stringify(json);
    };

    static parse(text) {
        return require("yaml").parse(text);
    };
}

class SQLiteDatabase {
    constructor(file = "./data.db", options = {}) {
        return new (require("sqlite").Database)({
            filename: path.join(Hizzy.directory, file),
            driver: require("sqlite3").Database, ...options
        });
    };
}

class MySQLDatabase {
    constructor(options = {}) {
        return require("mysql").createConnection(options);
    };
}

class MongoDatabase {
    constructor(url, options = {}) {
        return new (require("mongodb").MongoClient)(url, options);
    };
}

const XML = {
    parse: async xml => await require("xml2js").parseStringPromise(xml, null)
};

class ListDatabase {
    __list = [];
    autoSave = true;

    constructor() {
    };

    check(x) {
    };

    get(i) {
        return this.__list[i];
    };

    set(i, v) {
        for (let j = this.__list.length; j < i; j++) this.__list[j] = false;
        this.__list[i] = v;
    };

    all() {
        return [...this.__list];
    };

    len() {
        return this.__list.length;
    };

    add(x) {
        this.__list.push(x);
        if (this.autoSave) this.save();
    };

    remove(i) {
        if (i === -1) return;
        this.__list.splice(i, 1);
        if (this.autoSave) this.save();
    };

    indexOf(x) {
        return this.__list.indexOf(x);
    };

    clear() {
        this.__list.splice(0, this.__list.length);
        if (this.autoSave) this.save();
    };

    save() {
    };
}

class BitListDatabase extends ListDatabase {
    #file;

    constructor(file) {
        super();
        this.#file = file;
        let l = "";
        let k = false;
        if (!fs.existsSync(file)) fs.writeFileSync(file, "0\u0000");
        const c = fs.readFileSync(file);
        for (let i = 0; i < c.length; i++) {
            const h = c[i];
            if (k) {
                const bits = h.toString(2);
                for (let j = 0; j < bits.length; j++) {
                    if (this.__list.length === l) return;
                    this.__list.push(bits[j] * 1);
                }
            } else {
                if (h === 0) {
                    k = true;
                    l = l * 1;
                    break;
                }
                l += String.fromCharCode(h);
            }
        }
    };

    add(x) {
        super.add(x ? 1 : 0);
    };

    save() {
        let i;
        let s = [];
        let b = 0;
        let k = 0;
        for (i = 0; i < this.__list.length; i++) {
            b += this.__list[i] << (8 - k);
            k++;
            if (k === 8) {
                s.push(b);
                b = 0;
                k = 0;
            }
        }
        if (k > 0) s.push(b);
        fs.writeFileSync(this.#file, this.__list.length + "\u0000");
    };
}

def = (a, b) => Object.defineProperty(global, a, {get: () => b});

module.exports = class DatabaseAddon extends AddonModule {
    static JSON = JSONDatabase;
    static NestedJSON = NestedJSONDatabase;
    static YAML = YAMLDatabase;
    static NestedYAML = NestedYAMLDatabase;
    static XML = XML;
    static SQLite = SQLiteDatabase;
    static MySQL = MySQLDatabase;
    static Mongo = MongoDatabase;
};
/*
todo global.ListDatabase = {
    int: 1, // a basic list of ints / strings
    string: 1,
    bit: 1,
    byte: 1,
    int2,
    int4,
    int8,
    int16,
    int32,
    int64,
    uint too etc. etc., floats, doubles etc.etc.
};
*/