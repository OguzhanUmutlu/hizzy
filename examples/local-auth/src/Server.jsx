global.auth = new LocalAuthentication;

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
    <Route
        path="/qwe"
        onRequest={(req, res) => res.send("test")}
    />
</Routes>;