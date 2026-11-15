// Keyboard-focus walker for QA: Tab through the page and report focus order + focus styling.
import { writeFileSync } from 'node:fs';

const [url, width = '1440', height = '900', out = 'none'] = process.argv.slice(2);
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
ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
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
await send('Emulation.setDeviceMetricsOverride', { width: Number(width), height: Number(height), deviceScaleFactor: 1, mobile: Number(width) < 600 });
await send('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 3600));

const describe = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { tag: 'BODY' };
  const st = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
    type: el.type || null,
    id: el.id || null,
    name: el.name || null,
    text: (el.textContent || '').trim().slice(0, 34),
    ariaLabel: el.getAttribute('aria-label'),
    ariaPressed: el.getAttribute('aria-pressed'),
    outline: st.outlineStyle + ' ' + st.outlineWidth + ' ' + st.outlineColor,
    boxShadow: st.boxShadow.slice(0, 90),
    visible: r.width > 0 && r.height > 0,
  };
})()`;

const seen = [];
for (let i = 0; i < 14; i++) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
    await new Promise((r) => setTimeout(r, 80));
    const res = await send('Runtime.evaluate', { expression: describe, returnByValue: true });
    seen.push(res.result?.value);
}
console.log(JSON.stringify(seen, null, 1));

if (out !== 'none') {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(out, Buffer.from(shot.data, 'base64'));
}
await fetch(`http://127.0.0.1:${port}/json/close/${tabId}`).catch(() => {});
ws.close();
process.exit(0);
