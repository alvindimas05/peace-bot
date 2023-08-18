import { Client, GroupChat, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import fs from "fs";

// Initialize the client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ["--no-sandbox"] },
    ffmpegPath: process.env.FFMPEG_PATH
});

// Print QR Code
client.on("qr", qr => qrcode.generate(qr, { small: true }));

// Mention if ready
client.on("ready", () => console.log("Client is ready!"));

// Handle join member
const welcome = fs.readFileSync(__dirname + "/../messages/welcome.txt", "utf-8");
client.on("group_join", async chat => {
    const contact = await client.getContactById(chat.recipientIds[0]);
    const group = (await chat.getChat()) as GroupChat;

    var txt = welcome.replace("{number}", contact.id.user);
    txt = txt.replace("{group_name}", group.name);
    client.sendMessage(chat.chatId, txt, { mentions: [contact.id._serialized as any] });
});

// Handler leave member
const bye = fs.readFileSync(__dirname + "/../messages/bye.txt", "utf-8");
client.on("group_leave", async chat => {
    const contact = await client.getContactById(chat.recipientIds[0]);
    var txt = bye.replace("{number}", contact.id.user);
    client.sendMessage(chat.chatId, txt, { mentions: [contact.id._serialized as any] });
});

export default client;