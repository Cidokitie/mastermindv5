
const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Boom } = require('@hapi/boom');
const { state, saveState } = useSingleFileAuthState('./session.json');

let startTime = new Date();

const startBot = async () => {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        const isGroup = from.endsWith('@g.us');

        if (body.startsWith('.menu')) {
            const menuImagePath = path.join(__dirname, 'media', 'menu.jpg');
            const caption = `
*MASTERMIND V5*
Multi-Device WhatsApp Bot
Developed by Mastermind

👑 *Owner:* Mastermind  
🌍 *Location:* Abuja, Nigeria  
💻 *Version:* 5.0  
📦 *Prefix:* .  
📶 *Status:* Online

🧾 *Main Commands*
.menu - Show this menu  
.ping - Show bot latency  
.play <name> - Play YouTube audio  
.quote - Random quote  
.vv - Disable view-once media  
.kick - Remove user (admin only)  
.promote / .demote - Group controls  
.status - Bot system info  
.rules - Show group rules  
.support - Contact Mastermind  
.uptime - Show bot uptime  
.owner - Show owner info  
.alive - Check if bot is alive
.groupinfo - Info about the group`;

            await sock.sendMessage(from, { image: { url: menuImagePath }, caption });
        }

        if (body === '.ping') {
            const timestamp = new Date().getTime();
            const latency = timestamp - (msg.messageTimestamp * 1000);
            await sock.sendMessage(from, { text: `🏓 Pong! Latency: ${latency}ms` });
        }

        if (body === '.uptime') {
            const uptimeMs = new Date() - startTime;
            const uptimeSec = Math.floor(uptimeMs / 1000);
            const hours = Math.floor(uptimeSec / 3600);
            const minutes = Math.floor((uptimeSec % 3600) / 60);
            const seconds = uptimeSec % 60;
            await sock.sendMessage(from, { text: `⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s` });
        }

        if (body === '.owner') {
            await sock.sendMessage(from, { text: `👑 Mastermind
📍 Abuja, Nigeria
📞 WhatsApp: 091-233-59124
📧 Email: abdulrasheedmustapha3030@gmail.com` });
        }

        if (body === '.rules') {
            await sock.sendMessage(from, { text: `📜 *Group Rules:*
1. No spam
2. Be respectful
3. No illegal content
4. Follow admin instructions` });
        }

        if (body === '.support') {
            await sock.sendMessage(from, { text: `📨 For support, contact Mastermind:
WhatsApp: 091-233-59124
Email: abdulrasheedmustapha3030@gmail.com` });
        }

        if (body === '.prefix') {
            await sock.sendMessage(from, { text: `The current command prefix is: \`.\`` });
        }

        if (body === '.alive') {
            const aliveImagePath = path.join(__dirname, 'media', 'menu.jpg');
            await sock.sendMessage(from, { image: { url: aliveImagePath }, caption: "✅ I'm alive and running!" });
        }

        if (body === '.groupinfo' && isGroup) {
            const metadata = await sock.groupMetadata(from);
            const groupInfo = `👥 *Group Info:*
• Name: ${metadata.subject}
• ID: ${from}
• Participants: ${metadata.participants.length}
• Created: ${new Date(metadata.creation * 1000).toLocaleString()}`;
            await sock.sendMessage(from, { text: groupInfo });
        }
    });
};

startBot();
