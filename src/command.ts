import { Message, MessageMedia } from "whatsapp-web.js";
import axios from "axios";
import fs from "fs";
import db from "./database";

const HF_API_KEY = process.env.HF_API_KEY!;
const MENU = fs.readFileSync(__dirname + "/../messages/menu.txt", "utf-8")
    .replace("{prefix}", process.env.PREFIX!);

class Command {
    message: Message;
    msg: string;
    reply: Message | null = null;
    chat_msg: string = "";

    constructor(message: Message , msg: string){
        this.msg = msg;
        this.message = message;
    }
    async chat(){
        this.reply = await this.message.reply("...");
        var res = await fetch("https://chatgpt.btz.pm/api/openai/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer ak-Public"
            },
            body: JSON.stringify({
                frequency_penalty: 0,
                model: "gpt-3.5-turbo",
                presence_penalty: 0,
                stream: true,
                temperature: 0.5,
                top_p: 1,
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant"
                    },
                    {
                        role: "user",
                        content: this.msg
                    }
                ]
            })
        });
        const decoder = new TextDecoder('utf-8');
        const reader = res.body!.getReader();
        
        await this.processChat(reader, decoder);
    }
    async processChat(reader: ReadableStreamDefaultReader<Uint8Array>, decoder: TextDecoder){
        var done = false;
        try {
            const val = (await reader.read()).value
            const chunk = decoder.decode(val);
    
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            // Process each line
            for (const line of lines) {
                var message = line.replace(/^data: /, '');
                if (message === '[DONE]') {
                    done = true;
                }
                if(!line.includes("content")) continue;
    
                message = message.slice(message.indexOf('"content":"') + 11);
                var token = "";
                for(var i = 0; i < message.length; i++){
                    var c = message[i];
                    if(message[i]+message[i+1]+message[i+2] == '"},') break;
                    token += c;
                }
                this.chat_msg += token;
                if(token.includes('.')) await this.reply?.edit(this.chat_msg);
                // con  sole.log(token);
                // var json = JSON.parse(message);
                // var msg = json.choices[0].delta.content;
                // if(msg === undefined) return;
    
                // process.stdout.write(msg);
            }
        } catch (err) {
            console.error(err);
        }
        if(!done) await this.processChat(reader, decoder);
        else await this.reply?.edit(this.chat_msg);
    }
    async sticker(){
        // If has mention
        if(this.message.hasQuotedMsg){
            const quoted = await this.message.getQuotedMessage();
            if(quoted.hasMedia){
                var media = await quoted.downloadMedia();
                if(!this.validateSticker(media)) return this.message.reply("File bukan gambar atau video!");

                return this.message.reply(media, undefined, { sendMediaAsSticker: true });
            }
        }

        // If doesn't have mention
        if(!this.message.hasMedia) return this.message.reply("Mana gambarnya?");

        var media = await this.message.downloadMedia();
        if(!this.validateSticker(media)) return this.message.reply("File bukan gambar atau video!");

        this.message.reply(media, undefined, { sendMediaAsSticker: true });
    }
    validateSticker(media: MessageMedia){
        return ["image/png", "image/jpeg", "image/gif", "video/mp4"].includes(media.mimetype);
    }
    async image(){
        try {
            this.message.react("⏳");
            var res = await axios.post("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1", {
                inputs: this.msg,
                wait_for_model: true
            }, {
                headers: { "Authorization": `Bearer ${HF_API_KEY}` },
                responseType: "arraybuffer"
            });
            var media = new MessageMedia("image/png", Buffer.from(res.data, "binary").toString("base64"));
            this.message.reply(media);
        } catch(err: any){
            this.message.reply(err.toString());
        }
    }
    async menu(){
        this.message.reply(MENU);
    }
    async blacklist(){
        if(!await this.checkFromOwner()) return;

        const mentioned = this.message.mentionedIds.map((co: string) => co.replace("@c.us", ""));
        await db.read();
        (db.data as any).blacklist.push(...mentioned);
        await db.write();

        this.message.reply("Berhasil blacklist!");
    }
    async unblacklist(){
        if(!await this.checkFromOwner()) return;

        const mentioned = this.message.mentionedIds.map((co: string) => co.replace("@c.us", ""));
        await db.read();
        (db.data as any).blacklist = (db.data as any).blacklist
            .filter((co: string) => !mentioned.includes(co));
        await db.write();

        this.message.reply("Berhasil unblacklist!");
    }
    async checkFromOwner(){
        const contact = await this.message.getContact();
        const isOwner = contact.number === process.env.OWNER_NUMBER;
        if(!isOwner) this.message.reply("Elu siapa cok asu?!");

        return isOwner;
    }
    async isBlacklist(){
        const contact = await this.message.getContact();
        await db.read();

        return (db.data as any).blacklist.includes(contact.number);
    }
}

export default Command;