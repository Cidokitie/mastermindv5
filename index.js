// MASTERMIND V5 - WhatsApp Multi-Device Bot
const { makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const { useSingleFileAuthState } = require('@whiskeysockets/baileys/lib/auth');
const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const axios = require('axios');

const { state, saveState } = useSingleFileAuthState('./session.json');
const OWNER_NUMBER = '2349123359124@s.whatsapp.net';
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
            caption: `*MASTERMIND V5 MENU*\n\n` +
            `» ${PREFIX}menu - Show this menu\n` +
            `» ${PREFIX}ping - Latency check\n` +
            `» ${PREFIX}play <query> - YouTube audio\n` +
            `» ${PREFIX}quote - Random quote\n` +
            `» ${PREFIX}kick @user - Kick user\n` +
            `» ${PREFIX}promote @user - Promote\n` +
            `» ${PREFIX}vv - Reveal view-once\n` +
            `» ${PREFIX}status - Bot status\n` +
            `» ${PREFIX}owner - Owner contact\n` +
            `» ${PREFIX}groupinfo - Group info\n` +
            `» ${PREFIX}uptime - Uptime\n` +
            `» ${PREFIX}update - Refresh bot`
        });
    } else {
        await sock.sendMessage(from, {
            text: `📜 MASTERMIND V5 COMMANDS:\n.menu\n.ping\n.play <query>\n.quote\n.kick @user\n.promote @user\n.vv\n.status\n.owner\n.groupinfo\n.uptime\n.update`
        });
    }
}

async function searchYoutube(query) {
    const { data } = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    const id = data.match(/"videoId":"([^"]{11})"/)?.[1];
    return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

async function startBot() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: { level: 'warn' },
        browser: ['Mastermind V5', 'Safari', '5.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting...');
            if (shouldReconnect) setTimeout(startBot, 5000);
        } else if (connection === 'open') {
            console.log('✅ MastermindV5 connected');
        }
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const isGroup = from.endsWith('@g.us');
        const isOwner = sender === OWNER_NUMBER;
        const args = body.slice(PREFIX.length).trim().split(/\s+/);
        const command = args.shift()?.toLowerCase();

        if (settings.autoReact && !body.startsWith(PREFIX)) {
            await sock.sendMessage(from, {
                react: { text: getRandomEmoji(), key: msg.key }
            });
        }

        if (!command) return;

        try {
            switch (command) {
                case 'menu': await sendMenu(sock, from); break;

                case 'ping':
                    const latency = Date.now() - (msg.messageTimestamp * 1000);
                    await sock.sendMessage(from, { text: `🏓 Pong! ${latency}ms` });
                    break;

                case 'play':
                    if (!args[0]) return sock.sendMessage(from, { text: '🎵 Provide a query or URL' });
                    const url = args[0].includes('youtube.com') ? args[0] : await searchYoutube(args.join(' '));
                    if (!url) return sock.sendMessage(from, { text: '❌ No video found' });
                    const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
                    await sock.sendMessage(from, { audio: { stream }, mimetype: 'audio/mp4' });
                    break;

                case 'quote':
                    await sock.sendMessage(from, { text: `💬 ${quotes[Math.floor(Math.random() * quotes.length)]}` });
                    break;

                case 'vv':
                    const vMsg = msg.message?.viewOnceMessage?.message;
                    if (vMsg) await sock.sendMessage(from, { ...vMsg, viewOnce: false });
                    break;

                case 'kick':
                case 'promote':
                    if (!isGroup || !isOwner) return sock.sendMessage(from, { text: '🚫 Group admin only' });
                    const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!target) return sock.sendMessage(from, { text: '⚠️ Mention user' });
                    await sock.groupParticipantsUpdate(from, [target], command === 'kick' ? 'remove' : 'promote');
                    break;

                case 'status':
                    const uptime = formatUptime(Date.now() - startTime);
                    const used = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                    await sock.sendMessage(from, {
                        text: `🧠 *Mastermind Bot Status*\n` +
                              `» Owner: Mastermind\n» Version: ${VERSION}\n` +
                              `» Prefix: ${PREFIX}\n» RAM: ${used} MB\n» Uptime: ${uptime}`
                    });
                    break;

                case 'uptime':
                    await sock.sendMessage(from, { text: `⏱ Uptime: ${formatUptime(Date.now() - startTime)}` });
                    break;

                case 'owner':
                    await sock.sendMessage(from, {
                        text: `👑 Mastermind\n📍 Abuja, Nigeria\n📞 091-233-59124\n📧 abdulrasheedmustapha3030@gmail.com`
                    });
                    break;

                case 'groupinfo':
                    if (!isGroup) return sock.sendMessage(from, { text: '❌ Group only command' });
                    const meta = await sock.groupMetadata(from);
                    await sock.sendMessage(from, {
                        text: `👥 *Group Info*\nName: ${meta.subject}\nID: ${from}\nParticipants: ${meta.participants.length}`
                    });
                    break;

                case 'update':
                    if (!isOwner) return sock.sendMessage(from, { text: '🚫 Owner only' });
                    await sock.sendMessage(from, { text: '🔄 Bot update triggered! (placeholder)' });
                    // Place update logic here (e.g., fetch latest features or reset session)
                    break;

                default:
                    await sock.sendMessage(from, { text: '⚠️ Unknown command. Type .menu to see available commands.' });
            }
        } catch (err) {
            console.error('Command error:', err);
            await sock.sendMessage(from, { text: '❌ Failed to process command.' });
        }
    });
}

startBot().catch(err => {
    console.error('Startup error:', err);
    setTimeout(startBot, 10000);
});
