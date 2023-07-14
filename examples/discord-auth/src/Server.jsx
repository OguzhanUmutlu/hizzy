import {config} from "dotenv";
config();

global.auth = new DiscordAuthentication({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    callbackURL: process.env.callbackURL,
    scopes: ["identify"]
});

export default <Routes>
    <Route path="/" route="App.jsx" onRequest={auth.required()} allow={["App.css"]}/>
    <Route path="/callback" onRequest={auth.createCallback("/")}/>
</Routes>;