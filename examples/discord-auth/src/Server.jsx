import {config} from "dotenv";
import Auth from "@hizzyjs/authentication";

config();

global.auth = new Auth.DiscordAuthentication({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    callbackURL: process.env.callbackURL,
    scopes: ["identify"]
});

export default <Routes>
    <Route path="/" route="App.jsx" onRequest={auth.required()} allow={["App.css"]}/>
    <Route path="/callback" onRequest={auth.createCallback("/")}/>
</Routes>;