(() => {
    const vw = window.innerWidth;
    const offenders = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.right > vw + 1 || r.left < -1) {
            const style = getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none') continue;
            offenders.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 120),
                left: Math.round(r.left),
                right: Math.round(r.right),
                width: Math.round(r.width),
                pos: style.position,
                overflowX: style.overflowX,
            });
        }
    }
    return {
        innerWidth: vw,
        docScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyWidth: document.body.getBoundingClientRect().width,
        shellWidth: document.querySelector('.auth-shell')?.getBoundingClientRect().width,
        frameWidth: document.querySelector('.auth-shell > div')?.getBoundingClientRect().width,
        offenders: offenders.slice(0, 25),
    };
})()
