// noinspection JSUnusedGlobalSymbols

// @ts-ignore
import Hizzy from "hizzy";
import {Database} from "sqlite";
import {createConnection} from "mysql";
import {MongoClient, MongoClientOptions} from "mongodb";

type XML_JSON = {
    [x: string]: XML_JSON | string,
    "$"?: Record<string, string>,
    "_"?: string
};
type SQLOptions = Object;
type MySQLOptions = Object;

declare class KeyDatabase {
    private __file: string;
    private __json: Object;
    private __updated: string;
    private __interval: number | undefined;

    constructor(file: string);

    set(key, value): this;

    get(key): any;

    has(key): boolean;

    push(key: string, value: any): this;

    add(key: string, value?: number): this;

    subtract(key: string, value?: number): this;

    get isDestroyed(): boolean;

    destroy(): void;

    save(): this;

    clone(): this;
}

declare class NestedKeyDatabase extends KeyDatabase {
    NESTED_SPL: string;

    private __nested(key: string, d?: boolean);
}

declare class JSONDatabase extends KeyDatabase {
    asNested(): NestedJSONDatabase;

    static stringify(json: Object, space?: number): string;

    static parse(text: string): Object;
}

declare class NestedJSONDatabase extends KeyDatabase {
    asNotNested(): JSONDatabase;

    static stringify(json: Object, space?: number): string;

    static parse(text: string): Object;
}

declare class YAMLDatabase extends KeyDatabase {
    asNested(): NestedYAMLDatabase;

    static stringify(json: Object, space?: number): string;

    static parse(text: string): Object;
}

declare class NestedYAMLDatabase extends KeyDatabase {
    asNotNested(): YAMLDatabase;

    static stringify(json: Object, space?: number): string;

    static parse(text: string): Object;
}

declare class SQLiteDatabase extends Database {
    constructor(file?: string, options?: SQLOptions);
}

declare class MySQLDatabase extends createConnection {
    constructor(options: MySQLOptions);
}

declare class MongoDatabase extends MongoClient {
    constructor(options: MongoClientOptions);
}

type XMLDatabase = {
    parse: (xml: string) => XML_JSON | any
};

declare class DatabaseAddon extends Hizzy.API.AddonModule {
    static JSON: typeof JSONDatabase;
    static NestedJSON: typeof NestedJSONDatabase;
    static YAML: typeof YAMLDatabase;
    static NestedYAML: typeof NestedYAMLDatabase;
    static XML: XMLDatabase;
    static SQLite: typeof SQLiteDatabase;
    static MySQL: typeof MySQLDatabase;
    static Mongo: typeof MongoDatabase;
}

export = DatabaseAddon;