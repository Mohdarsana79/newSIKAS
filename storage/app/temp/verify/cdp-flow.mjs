// QA flows: reduced-motion emulation + real validation-error state (read-only QA helper).
import { writeFileSync } from 'node:fs';

const [url, width = '1440', height = '900', mode = 'reduce', out = 'none', shot = 'none'] = process.argv.slice(2);
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
const evaljs = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) return { error: res.exceptionDetails.exception?.description || 'eval error' };
    return res.result?.value;
};

await new Promise((resolve) => (ws.onopen = resolve));
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: Number(width), height: Number(height), deviceScaleFactor: 1, mobile: Number(width) < 600 });

if (mode === 'reduce') {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
}
await send('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 3600));

let value;
if (mode === 'reduce') {
    value = await evaljs(`(() => {
        const pick = (sel) => Array.from(document.querySelectorAll(sel)).slice(0, 3).map((el) => {
            const st = getComputedStyle(el);
            return { sel, cls: String(el.className).slice(0, 40), opacity: st.opacity, animation: st.animationName, transform: st.transform, filter: st.filter };
        });
        const mq = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const sceneAnims = [];
        for (const el of document.querySelectorAll('*')) {
            const n = getComputedStyle(el).animationName;
            if (n && n !== 'none') sceneAnims.push(n);
        }
        return { mq, rise: pick('.auth-rise'), draw: document.querySelector('.auth-draw path') ? { dashoffset: getComputedStyle(document.querySelector('.auth-draw path')).strokeDashoffset, anim: getComputedStyle(document.querySelector('.auth-draw path')).animationName } : null, remainingAnimations: [...new Set(sceneAnims)] };
    })()`);
} else if (mode === 'error') {
    value = await evaljs(`(async () => {
        const form = document.querySelector('form');
        form.requestSubmit
            ? form.requestSubmit()
            : form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await new Promise((r) => setTimeout(r, 2200));
        const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=checkbox])')).map((i) => {
            const db = i.getAttribute('aria-describedby');
            return {
                id: i.id,
                ariaInvalid: i.getAttribute('aria-invalid'),
                describedBy: db,
                describedExists: db ? db.split(' ').every((x) => !!document.getElementById(x)) : null,
                describedText: db ? db.split(' ').map((x) => document.getElementById(x)?.textContent?.trim() || '').join(' | ') : null,
            };
        });
        const errs = Array.from(document.querySelectorAll('p[id$="-error"]')).map((p) => ({ id: p.id, text: p.textContent.trim() }));
        return { path: location.pathname, inputs, errs, html: document.body.innerText.slice(0, 400) };
    })()`);
}
console.log(JSON.stringify(value, null, 1));
if (shot !== 'none') {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(shot, Buffer.from(s.data, 'base64'));
    console.log('saved', shot);
}
await fetch(`http://127.0.0.1:${port}/json/close/${tabId}`).catch(() => {});
ws.close();
process.exit(0);
