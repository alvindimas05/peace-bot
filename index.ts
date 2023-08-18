import dotenv from "dotenv";
dotenv.config();

import client from "./src/client";
import Command from "./src/command";

const PREFIX = process.env.PREFIX!;

client.on("message", async message => {
    if(message.body.charAt(0) !== PREFIX) return;

    const [cmd, msg] = normalize_message(message.body);
    const command = new Command(message, msg);
    if(await command.isBlacklist()) return;

    switch(cmd){
        case "image":
        case "i":
            command.image();
            break;
        case "sticker":
        case "s":
            command.sticker();
            break;
        case "c":
        case "chat":
            command.chat();
            break;
        case "bl":
        case "blacklist":
            command.blacklist();
            break;
        case "unbl":
        case "unblacklist":
            command.unblacklist();
            break;
        case "h":
        case "m":
        case "help":
        case "menu":
        default:
            command.menu();
    }
});

function normalize_message(msg: string): string[]{
    var split = msg.split(" ")
    var cmd = msg.split(" ")[0].replace(PREFIX, "");

    split.shift();
    var real_msg = split.join();

    return [cmd, real_msg]
}

// Start the client
client.initialize();