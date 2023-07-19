import {openPage, useState} from "hizzy";
import "./App.css";

// @server/respond
async function login(username, password) {
    const passwords = {
        "Hizzy": "/%6!32K+!'", // good job, Hizzy!
        "Elon Musk": "1234" // oh, no! not secure!
    };
    if (passwords[username] !== password) return false;
    await auth.login(currentClient, {username, password});
    return true;
}

export default function () {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    async function onLogin() {
        const response = await login(username, password);
        if (response) openPage("/");
        else alert("Wrong credentials!");
    }

    return <div>
        Username: <input value={username} onChange={event => setUsername(event.target.value)}/><br/><br/>
        Password: <input value={password} onChange={event => setPassword(event.target.value)}
                         type="password"/><br/><br/>
        <button onClick={onLogin}>Log In</button>
    </div>;
};