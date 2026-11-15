(() => {
    const lum = (rgb) => {
        const c = rgb.map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const parse = (s) => {
        const m = String(s).match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(',').map((x) => parseFloat(x));
        return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
    };
    const blend = (fg, bg) => fg.rgb.map((v, i) => v * fg.a + bg[i] * (1 - fg.a));
    const bgOf = (el) => {
        let node = el;
        const stack = [];
        while (node && node !== document.documentElement) {
            const st = getComputedStyle(node);
            const p = parse(st.backgroundColor);
            if (p && p.a > 0) {
                stack.push(p);
                if (p.a >= 1) break;
            }
            node = node.parentElement;
        }
        let base = [255, 255, 255];
        for (let i = stack.length - 1; i >= 0; i--) base = blend(stack[i], base);
        return base;
    };
    const ratio = (a, b) => {
        const l1 = lum(a), l2 = lum(b);
        const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
        return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
    };
    const contrast = (el) => {
        const st = getComputedStyle(el);
        const fg = parse(st.color);
        const bg = bgOf(el);
        if (!fg) return null;
        const eff = blend(fg, bg);
        return { color: st.color, bg: `rgb(${bg.map(Math.round).join(',')})`, ratio: ratio(eff, bg) };
    };

    // 1. contrast on small text
    const small = [];
    const seen = new Set();
    for (const el of document.querySelectorAll('p,span,a,label,button,h1,h2,footer,div')) {
        const direct = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!direct) continue;
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none' || parseFloat(st.opacity) === 0) continue;
        const box = el.getBoundingClientRect();
        if (box.width < 1 || box.height < 1) continue;
        const size = parseFloat(st.fontSize);
        if (size > 15) continue;
        const c = contrast(el);
        if (!c) continue;
        const key = `${el.tagName}|${el.className.slice(0, 80)}|${size}`;
        if (seen.has(key)) continue;
        seen.add(key);
        small.push({
            text: (el.textContent || '').trim().slice(0, 38),
            size: Math.round(size * 10) / 10,
            weight: st.fontWeight,
            ...c,
        });
    }
    small.sort((a, b) => a.ratio - b.ratio);

    // 2. label/input association
    const inputs = Array.from(document.querySelectorAll('input:not([type=hidden])')).map((i) => {
        const label = i.id ? document.querySelector(`label[for="${i.id}"]`) : null;
        return {
            id: i.id,
            name: i.name,
            type: i.type,
            required: i.required,
            readOnly: i.readOnly,
            autoComplete: i.getAttribute('autocomplete'),
            hasLabelFor: !!label,
            ariaInvalid: i.getAttribute('aria-invalid'),
            ariaDescribedBy: i.getAttribute('aria-describedby'),
            describedExists: i.getAttribute('aria-describedby')
                ? i.getAttribute('aria-describedby').split(' ').every((x) => !!document.getElementById(x))
                : null,
            w: Math.round(i.getBoundingClientRect().width),
            h: Math.round(i.getBoundingClientRect().height),
        };
    });

    // 3. buttons + accessible names
    const buttons = Array.from(document.querySelectorAll('button')).map((b) => ({
        text: (b.textContent || '').trim().slice(0, 30),
        ariaLabel: b.getAttribute('aria-label'),
        ariaPressed: b.getAttribute('aria-pressed'),
        type: b.type,
        disabled: b.disabled,
        busy: b.getAttribute('aria-busy'),
        w: Math.round(b.getBoundingClientRect().width),
        h: Math.round(b.getBoundingClientRect().height),
    }));

    // 4. headings order
    const headings = Array.from(document.querySelectorAll('h1,h2,h3')).map((h) => ({
        tag: h.tagName,
        text: (h.textContent || '').trim().slice(0, 44),
        size: getComputedStyle(h).fontSize,
        family: getComputedStyle(h).fontFamily.split(',')[0],
    }));

    // 5. animations
    const animated = [];
    for (const el of document.querySelectorAll('*')) {
        const st = getComputedStyle(el);
        if (st.animationName && st.animationName !== 'none') animated.push(st.animationName);
    }
    const animCounts = animated.reduce((m, n) => ((m[n] = (m[n] || 0) + 1), m), {});

    // 6. layout / clipping
    const shell = document.querySelector('.auth-shell');
    const card = document.querySelector('main .relative.overflow-hidden');
    const rect = (el) => (el ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height), bottom: Math.round(el.getBoundingClientRect().bottom) } : null);

    return {
        url: location.pathname,
        viewport: { w: innerWidth, h: innerHeight },
        docScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        pageHeight: document.documentElement.scrollHeight,
        vScroll: document.documentElement.scrollWidth > innerWidth,
        shell: rect(shell),
        card: rect(card),
        inputs,
        buttons,
        headings,
        animCounts,
        lowContrast: small.filter((s) => s.ratio < 4.5).slice(0, 14),
        minContrast: small[0] || null,
        darkHtml: document.documentElement.classList.contains('dark'),
        bodyBg: getComputedStyle(document.body).backgroundColor,
        shellBg: shell ? getComputedStyle(shell).backgroundColor : null,
    };
})()
