// todo: google
// todo: github
// todo: xbox
// todo: facebook
// todo: allowing custom, update: it kind of does now
const {EventEmitter} = require("events");

class CookieAuth extends EventEmitter {
    #cookieName;
    #cookieNameJ;
    tokens = {};

    constructor(options, defCookie) {
        super();
        const opts = options || {};
        const cookieName = opts.cookie || defCookie;
        this.#cookieName = cookieName;
        this.#cookieNameJ = JSON.stringify(cookieName);
    };

    get cookie() {
        return this.#cookieName;
    };

    async __login(req, user, pk = true) {
        if (req.__socket) req = req.__socket;
        if (req._uuid) req = req._uuid;
        if (pk && typeof req !== "string") return false;
        const token = crypto.randomUUID();
        this.tokens[token] = user;
        this.emit("tokensUpdate");
        if (pk) await Hizzy.sendEvalTo(req, `document.cookie=${this.#cookieNameJ}+"=${token}"`);
        return token;
    };

    async logout(req, pk = true) {
        if (!req.headers) {
            if (req.__socket) req = req.__socket;
            if (req._req) req = req._req;
        }
        let uuid = req;
        if (uuid.__socket) uuid = uuid.__socket;
        if (uuid._uuid) uuid = uuid._uuid;
        if (pk && typeof uuid !== "string") return false;
        const token = Hizzy.getCookie(req.headers.cookie, this.#cookieName);
        delete this.tokens[token];
        this.emit("tokensUpdate");
        if (pk) await Hizzy.sendEvalTo(uuid, `document.cookie=${this.#cookieNameJ}+"=; expires=Thu, 01 Jan 1970 00:00:00 UTC;"`);
        return true;
    };

    __required(val, req, res, next, ...args) {
    };

    required(...args) {
        return (req, res, next) => {
            if (!this.hasAuthenticated(req)) this.__required(true, req, res, next, ...args);
            else next();
        };
    };

    unrequired(...args) {
        return (req, res, next) => {
            if (this.hasAuthenticated(req)) this.__required(false, req, res, next, ...args);
            else next();
        };
    };

    hasAuthenticated(req) {
        return this.getData(req) !== undefined;
    };

    getData(req) {
        if (!req.headers) {
            if (req.__socket) req = req.__socket;
            if (req._req) req = req._req;
        }
        const token = Hizzy.getCookie(req.headers.cookie, this.#cookieName);
        return this.tokens[token];
    };
}

class LocalAuthentication extends CookieAuth {
    constructor(options) {
        super(options, "LocalAuthTokenSecret");
    };

    __required(val, req, res, next, url) {
        res.redirect(url);
    };

    async login(req, user, pk = true) {
        return !!(await this.__login(req, user, pk));
    };
}

class DiscordAuthentication extends CookieAuth {
    #clientId;
    #clientSecret;
    #scopes;
    #callbackURL;

    constructor(options) {
        const opts = options || {};
        super(opts, "DiscordAuthTokenSecret");
        this.#clientId = opts.clientId;
        this.#clientSecret = opts.clientSecret;
        this.#callbackURL = opts.callbackURL;
        this.#scopes = opts.scopes || [];
    };

    __required(val, req, res, next, url) {
        res.redirect(this.authenticationURL);
    };

    get authenticationURL() {
        return `https://discord.com/api/oauth2/authorize?client_id=${this.#clientId}&redirect_uri=${encodeURI(this.#callbackURL)}&response_type=code&scope=${this.#scopes.join("%20")}`;
    };

    createCallback(redirect) {
        return async (req, res) => {
            if (!req.query.code) return res.redirect(this.authenticationURL);
            /*** @type {Record} */
            const oauthData = await (await fetch("https://discord.com/api/oauth2/token", {
                method: "POST",
                body: new URLSearchParams({
                    client_id: this.#clientId,
                    client_secret: this.#clientSecret,
                    code: req.query.code,
                    grant_type: "authorization_code",
                    redirect_uri: this.#callbackURL,
                    scope: this.#scopes.join(" ")
                }),
                headers: {"Content-Type": "application/x-www-form-urlencoded"}
            })).json();
            const data = await (await fetch("https://discord.com/api/users/@me", {
                headers: {authorization: oauthData.token_type + " " + oauthData.access_token},
            })).json();
            const token = await this.__login(req, data, false);
            res.setHeader("Set-Cookie", this.cookie + "=" + token);
            res.statusCode = 302;
            res.setHeader("Location", redirect);
            res.end();
        };
    };
}

const {AddonModule} = Hizzy;
module.exports = class AuthenticationAddon extends AddonModule {
    static LocalAuthentication = LocalAuthentication;
    static DiscordAuthentication = DiscordAuthentication;
    static _CookieAuth = CookieAuth;
};