import "./App.css";

// @server/respond
async function fetchUser() {
    return auth.getData(currentClient);
}

// @server/respond
async function logout() {
    await auth.logout(currentClient);
    return auth.authenticationURL;
}

const user = await fetchUser();

export default function () {
    return <div>
        Hello, <span>{user.username}</span><br/>
        <button onClick={async () => location.href = await logout()}>Log out</button>
    </div>;
};