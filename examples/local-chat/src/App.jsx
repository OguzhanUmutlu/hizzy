import "./App.css";

// @server
async function sendMessageToServer(content) {
    receiveMessages.everyone(chatHistory[chatHistory.length] = content);
}

// @server/join
async function onClientJoin() {
    receiveMessages(...chatHistory);
}

function receiveMessages(...messages) {
    for (const message of messages) document.querySelector(".messages").innerText += message + "\n";
}

async function sendMessage(event) {
    if (event.key !== "Enter") return;
    await sendMessageToServer(event.target.value);
    event.target.value = "";
}

export default <div>
    <div className="messages"></div>
    <input onKeyDown={sendMessage}/>
</div>;