import {openPage} from "hizzy";
import "./App.css";

// @server/respond
async function fetchUsername() {
    return auth.getData(currentClient).username;
}

// @server/respond
async function logout() {
    await auth.logout(currentClient);
    return true;
}

const username = await fetchUsername();

export default function () {
    async function onLogout() {
        if (await logout()) openPage("/login");
    }

    return <div>
        Hello, <span>{username}</span><br/>
        <button onClick={onLogout}>Log out</button>
    </div>;
};