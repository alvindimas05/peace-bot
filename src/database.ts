import { Low, JSONFile } from "@commonify/lowdb";

const adapter = new JSONFile(__dirname + "/../db.json");
const db = new Low(adapter);

// Initialize the database
(async () => {
    await db.read();
    db.data ||= {
        blacklist: []
    };
    await db.write();
})();

export default db;