import "./App.css";

// @server
async function sendMessageToServer(author, content) {
    if (
        typeof author !== "string" ||
        typeof content !== "string" ||
        author.length > 16 || author.length < 4 ||
        !content.length || content.length > 100
    ) return;
    await addMessage(author, content);
    receiveMessages.everyone({author, content});
}

// @server
async function onClientJoin(username) {
    if (currentClient.attributes.username) return currentClient.remove();
    currentClient.attributes.username = username;
    receiveMessages(...await getAllMessages());
    await broadcastMessage(username + " joined, welcome him!", receiveMessages);
}

// @server/leave
async function onClientLeave() {
    const username = currentClient.attributes.username;
    if (!username) return;
    await broadcastMessage(username + " left, farewell!", receiveMessages);
}

// @client
function receiveMessages(...messages) {
    for (const message of messages)
        document.querySelector(".messages").innerText += (message.author === null ? "" : message.author + " > ") + message.content + "\n";
}

let username;

async function sendMessage(event) {
    if (event.key !== "Enter") return;
    const input = event.target;
    await sendMessageToServer(username, input.value);
    input.value = "";
}

while (true) {
    username = prompt("Enter a username:") || "";
    if (username.length >= 4 && username.length <= 16) break;
}
await onClientJoin(username);

export default <div>
    <div className="messages"></div>
    <input onKeyDown={sendMessage} maxLength={100}/>
</div>;