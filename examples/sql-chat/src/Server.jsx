import Database from "@hizzyjs/database";

const db = new Database.SQLite();
await db.open();
await db.exec(`CREATE TABLE IF NOT EXISTS messages
               (
                   author
                   TEXT,
                   content
                   TEXT
               )`);
const addMessage = global.addMessage = async (author, content) => {
    await db.run(`INSERT INTO messages (author, content)
                  VALUES (?, ?)`, author, content);
};
global.getAllMessages = async () => {
    return await db.all(`SELECT *
                         FROM messages`);
};
global.broadcastMessage = async (msg, f) => {
    await addMessage("", msg);
    f.everyone({author: "", content: msg});
};

export default <Routes>
    <Route path="/" route="./App.jsx"/>
</Routes>;

