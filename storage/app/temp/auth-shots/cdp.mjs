// Minimal Chrome DevTools Protocol helper for local UI QA (not part of the app).
// Usage: node cdp.mjs <url> <width> <height> <outfile.png> [evalFile]
import { writeFileSync, readFileSync } from 'node:fs';

const [url, width = '390', height = '844', out = 'shot.png', evalFile] = process.argv.slice(2);
const port = 9333;

async function getWsUrl() {
    for (let i = 0; i < 50; i++) {
        try {
            const res = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
            if (res.ok) {
                const tab = await res.json();
                if (tab.webSocketDebuggerUrl) return { wsUrl: tab.webSocketDebuggerUrl, tabId: tab.id };
            }
        } catch { /* retry */ }
        await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error('CDP not ready');
}

const { wsUrl, tabId } = await getWsUrl();
const ws = new WebSocket(wsUrl);
let id = 0;
const pending = new Map();
const events = [];

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else {
        events.push(msg);
    }
};

const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
        const msgId = ++id;
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
    });

await new Promise((resolve) => (ws.onopen = resolve));

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
    width: Number(width),
    height: Number(height),
    deviceScaleFactor: 1,
    mobile: Number(width) < 600,
});
await send('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 3500));

const expression = readFileSync(evalFile, 'utf8');
const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
const value = result.result?.value;
console.log(JSON.stringify(value, null, 2));

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log('saved', out);

await fetch(`http://127.0.0.1:${port}/json/close/${tabId}`).catch(() => {});
ws.close();
process.exit(0);
