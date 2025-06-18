// MASTERMIND V5 - WhatsApp Multi-Device Bot
// index.js

const makeWASocket = require('@whiskeysockets/baileys').default;
const { useSingleFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const axios = require('axios');

// Config
const { state, saveState } = useSingleFileAuthState('./session.json');
const OWNER_NUMBER = '2349123359124';
const PREFIX = '.';
const VERSION = '5.0';
const startTime = new Date();

const settings = {
    autoReact: true,
    reactToStatus: false,
    randomEmoji: true
};

const emojiPool = ['😂','❤️','🔥','👍','👏','🎉','😍','🤩','🙌','💯'];
const quotes = [
    "The only way to do great work is to love what you do. - Steve Jobs",
    "Innovation distinguishes between a leader and a follower. - Steve Jobs"
];

function getRandomEmoji() {
    return emojiPool[Math.floor(Math.random() * emojiPool.length)];
}

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${d}d ${h}h ${m}m ${sec}s`;
}

async function sendMenu(sock, from) {
    const menuPath = path.join(__dirname, 'media', 'menu.jpg');
    if (fs.existsSync(menuPath)) {
        await sock.sendMessage(from, {
            image: { url: menuPath },
            caption: `*MASTERMIND V5 MENU*

» ${PREFIX}menu - Show this menu
» ${PREFIX}ping - Latency check
» ${PREFIX}play <query> - YouTube audio
» ${PREFIX}quote - Random quote
» ${PREFIX}kick @ - Kick user (Owner)
» ${PREFIX}promote @ - Promote (Owner)
» ${PREFIX}vv - Reveal view-once
» ${PREFIX}status - Bot status
» ${PREFIX}owner - Owner contact
» ${PREFIX}groupinfo - Info
» ${PREFIX}uptime - Uptime`
        });
    } else {
        await sock.sendMessage(from, {
            text: `📜 MASTERMIND V5 COMMANDS:
.menu
.ping
.play <query>
.quote
.kick @user
.promote @user
.vv
.status
.owner
.groupinfo
.uptime`
        });
    }
}

const startBot = async () => {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: { level: 'warn' },
        getMessage: async () => ({ conversation: 'msg not found' })
    });

    console.log('✅ MastermindV5 connected');
    sock.ev.on('creds.update', saveState);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const isGroup = from.endsWith('@g.us');
        const isOwner = sender.includes(OWNER_NUMBER);
        const args = body.slice(PREFIX.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        if (settings.autoReact && !body.startsWith(PREFIX)) {
            await sock.sendMessage(from, {
                react: {
                    text: settings.randomEmoji ? getRandomEmoji() : '👍',
                    key: msg.key
                }
            });
        }

        try {
            switch (command) {
                case 'menu': await sendMenu(sock, from); break;

                case 'ping': {
                    const latency = Date.now() - (msg.messageTimestamp * 1000);
                    await sock.sendMessage(from, { text: `🏓 Pong! ${latency}ms` });
                    break;
                }

                case 'play': {
                    if (!args[0]) return sock.sendMessage(from, { text: '🎵 Provide a search query or URL' });
                    const url = args[0].includes('youtube.com') ? args[0] : await searchYoutube(args.join(' '));
                    const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
                    await sock.sendMessage(from, { audio: { stream }, mimetype: 'audio/mp4' });
                    break;
                }

                case 'quote': {
                    const quote = quotes[Math.floor(Math.random() * quotes.length)];
                    await sock.sendMessage(from, { text: `💬 ${quote}` });
                    break;
                }

                case 'vv': {
                    const vMsg = msg.message?.viewOnceMessage?.message;
                    if (vMsg) await sock.sendMessage(from, { ...vMsg, viewOnce: false });
                    break;
                }

                case 'kick':
                case 'promote': {
                    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
                    if (!isOwner) return sock.sendMessage(from, { text: '🚫 This command is only for the bot owner' });
                    const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!target) return sock.sendMessage(from, { text: '⚠️ Mention user' });
                    const action = command === 'kick' ? 'remove' : 'promote';
                    await sock.groupParticipantsUpdate(from, [target], action);
                    break;
                }

                case 'status': {
                    const uptime = formatUptime(Date.now() - startTime);
                    const used = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                    await sock.sendMessage(from, {
                        text: `🧠 *Mastermind Bot Status*\n
» Owner: Mastermind
» Version: ${VERSION}
» Prefix: ${PREFIX}
» RAM: ${used} MB
» Uptime: ${uptime}`
                    });
                    break;
                }

                case 'uptime': {
                    const uptime = formatUptime(Date.now() - startTime);
                    await sock.sendMessage(from, { text: `⏱ Uptime: ${uptime}` });
                    break;
                }

                case 'owner': {
                    if (!isOwner) return sock.sendMessage(from, { text: '🚫 This command is only for the bot owner' });
                    await sock.sendMessage(from, {
                        text: `👑 Mastermind
📍 Abuja, Nigeria
📞 091-233-59124
📧 abdulrasheedmustapha3030@gmail.com`
                    });
                    break;
                }

                case 'groupinfo': {
                    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only' });
                    const meta = await sock.groupMetadata(from);
                    await sock.sendMessage(from, {
                        text: `👥 *Group Info*
Name: ${meta.subject}
ID: ${from}
Participants: ${meta.participants.length}`
                    });
                    break;
                }
            }
        } catch (err) {
            console.error(err);
            await sock.sendMessage(from, { text: '❌ Error processing command' });
        }
    });
};

async function searchYoutube(query) {
    const { data } = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    const id = data.match(/"videoId":"([^"]{11})"/)[1];
    return `https://www.youtube.com/watch?v=${id}`;
}

startBot().catch(console.error);
