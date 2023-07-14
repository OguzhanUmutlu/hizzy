// noinspection JSUnusedGlobalSymbols

import {VNode} from "preact";
import {Express, Request, Response} from "express";

type Socket = Record<any, any>;
type Method = "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head";
type SocketTraveler = string | number | null | SocketTraveler[] | {
    [key: string | number | symbol | null]: SocketTraveler
};
type onRequestFunction<T> = (request: Request, response: Response, next: (() => T)) => any;
type RoutesComponent = (props: {}) => VNode<RouteComponent>;
type RouteComponent = (props: {
    path: string | Location
    route?: string
    method?: Method
    allow?: string[] | "*"
    deny?: string[] | "*"
    // todo: a request event class, maybe a combination of request and response, i have no idea
    onRequest?: onRequestFunction<Promise<void>> | onRequestFunction<void | Promise<void>>[]
}) => VNode<RouteComponent> | void;

declare class AddonModule {
    get name(): string;

    get description(): string;

    get version(): string;

    get options(): Object;

    onLoad(): void;

    onEnable(): void;

    onDisable(reason: string): void;

    onClientSideLoad: string | Function;

    onClientSideRendered: string | Function;

    onClientSideError: string | ((error: Error) => void);

    disable(reason: string): void;

    log(...s: any): void;
}

declare class Client {
    static clients: Record<string, Client>;
    private __socket: Socket;
    class: typeof Client;
    attributes: Record<string | number | symbol, any>;

    constructor(socket: Socket);

    get uuid(): string;

    eval(code: string): Promise<SocketTraveler>;

    remove(reason?: string): void;

    run(file: string, name: string, ...args: SocketTraveler[]): Promise<SocketTraveler>;
}

declare class Addon_ {
    static addons: Record<string, Addon_>;

    static create(name: string, options: Object): Promise<Addon_>;

    constructor(name: string, options: Object);

    get options(): Object;

    get name(): string;

    get module(): AddonModule;
}

declare class APIClass {
    static API: APIClass;
    Addon: typeof Addon_;
    AddonModule: typeof AddonModule;
    Client: typeof Client;
    Route: RouteComponent;
    Routes: RoutesComponent;
    socketServer;
    server;
    autoRefresh: boolean;
    dev: boolean;
    routes: Record<string, string>;
    customShortcuts: Record<string, { description: string, run: () => void }>;
    app: Express
    preRequests: Function[];

    constructor(dir: string);

    init(): Promise<void>;

    findOptimalFile(file: string): string | null;

    sendErrorMessage(html: string, request: Request, response: Response, span: string | null): void;

    cacheDevFile(file: string): string | Buffer;

    cacheBuildFile(file: string, request: Request, response: Response): Promise<string | Object>;

    notFound(request: Request, response: Response): Promise<void>;

    getClientData(request: Request, response: Response): Object;

    prepLoad(request: Request, response: Response): void;

    renderHTML(content: string, request: Request, response: Response): void;

    sendRawFile(file: string, content: string, res): void;

    sendFile(file: string, content: string, request: Request, response: Response): void;

    enableRealtime(): void;

    listen(): Promise<void>;

    build(): Promise<void>;

    buildMainFile(): Promise<void>;

    scanBuild(): Promise<void>; // todo: make this file richer(fix 'any's and potential 'void's)

    renderJSX(file, code, req, res): Promise<any>;

    waitBuild(): Promise<void>;

    waitBuildScanning(): Promise<void>;

    sendEvalTo(uuid: string, code: string): Promise<SocketTraveler>;

    clientUUIDs(): string[];

    random(): string;

    broadcastEval(code: string): Promise<Record<string, SocketTraveler>>;

    getHash(uuid: string): string | null;

    findClient(uuid: string): Client | Record<string, SocketTraveler> | null;

    findSocket(uuid: string): Socket | null;

    get directory(): string;

    makeClientFunction(file: string, name: string, uuid?: string | null): Function;

    getAddon(name: string): Addon_ | null;

    getAddons(): Record<string, Addon_>;

    jsxToJS(code: string | Buffer, extension: string): string;

    processMain(code: string | Buffer): Promise<void>;

    getCookie(cookies: string, cookie: string): string | null;
}

declare global {
    let Hizzy: APIClass;
    /*** @description # This variable only works in server-side! */
    const currentUUID: string;
    /*** @description # This variable only works in server-side! */
    const currentClient: Client;
    /*** @description # This variable only works in client-side! */
    const currentWebSocket: WebSocket;
    let Routes: RoutesComponent;
    let Route: RouteComponent;

    interface Function {
        everyone: (...args: SocketTraveler[]) => Record<string, SocketTraveler>;
    }
}

export default APIClass;