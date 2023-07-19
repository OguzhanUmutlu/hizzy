import Auth from "@hizzyjs/authentication";

global.auth = new Auth.LocalAuthentication;

export default <Routes>
    <Route
        path="/"
        route="App.jsx"
        onRequest={auth.required("/login")}
        allow={["App.css"]}
    />
    <Route
        path="/login"
        route="Login.jsx"
        onRequest={auth.unrequired("/")}
        allow={["App.css"]}
    />
</Routes>;