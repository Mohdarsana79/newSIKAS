(() => {
    const targets = [];
    const add = (sel, label) => {
        const el = Array.from(document.querySelectorAll(sel)).find((e) => e.getBoundingClientRect().width > 0);
        if (!el) return;
        const r = el.getBoundingClientRect();
        targets.push({
            label,
            text: (el.textContent || '').trim().slice(0, 40),
            color: getComputedStyle(el).color,
            size: getComputedStyle(el).fontSize,
            weight: getComputedStyle(el).fontWeight,
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
        });
    };
    const aside = document.querySelector('aside');
    if (aside) {
        const ps = Array.from(aside.querySelectorAll('p'));
        ps.forEach((p, i) => add(`aside p:nth-of-type(${i + 1})`, 'aside-p-' + i));
    }
    const spans = Array.from(aside ? aside.querySelectorAll('span') : []);
    spans.forEach((s, i) => {
        const t = (s.textContent || '').trim();
        if (t && s.children.length === 0 && t.length > 3) {
            const r = s.getBoundingClientRect();
            if (r.width > 0)
                targets.push({
                    label: 'aside-span-' + i,
                    text: t.slice(0, 40),
                    color: getComputedStyle(s).color,
                    size: getComputedStyle(s).fontSize,
                    weight: getComputedStyle(s).fontWeight,
                    x: Math.round(r.x),
                    y: Math.round(r.y),
                    w: Math.round(r.width),
                    h: Math.round(r.height),
                });
        }
    });
    const aTags = Array.from(document.querySelectorAll('aside a'));
    aTags.forEach((a, i) =>
        targets.push({
            label: 'aside-a-' + i,
            text: (a.textContent || '').trim().slice(0, 40),
            color: getComputedStyle(a).color,
            size: getComputedStyle(a).fontSize,
            weight: getComputedStyle(a).fontWeight,
            x: Math.round(a.getBoundingClientRect().x),
            y: Math.round(a.getBoundingClientRect().y),
            w: Math.round(a.getBoundingClientRect().width),
            h: Math.round(a.getBoundingClientRect().height),
        }),
    );
    // mobile footer + card footnote (non-gradient, cross-check)
    add('main > div > p', 'mobile-footer');
    return { vp: { w: innerWidth, h: innerHeight }, targets };
})()
