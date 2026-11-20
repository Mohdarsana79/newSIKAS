const TABLE_WRAPPER_CLASS =
    'sikas-scroll my-2.5 max-h-80 overflow-x-auto overflow-y-auto scroll-smooth rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#15131F]';

function renderParsedTable(rows: string[]): string {
    if (rows.length < 2) return rows.join('\n');

    const headerCells = rows[0].split('|').slice(1, -1).map((c) => c.trim());
    const delimiterCells = rows[1].split('|').slice(1, -1).map((c) => c.trim());

    const aligns = delimiterCells.map((d) => {
        if (d.startsWith(':') && d.endsWith(':')) return 'text-center';
        if (d.endsWith(':')) return 'text-right';
        return 'text-left';
    });

    const dataRows = rows.slice(2);

    let html = `<div class="${TABLE_WRAPPER_CLASS}">`;
    html += '<table class="min-w-full divide-y divide-slate-100 text-xs dark:divide-white/5">';

    // Header (Sticky on vertical scroll)
    html +=
        '<thead class="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm dark:bg-[#1D1B2B]/95"><tr>';
    headerCells.forEach((th, idx) => {
        const align = aligns[idx] || 'text-left';
        html += `<th class="whitespace-nowrap border-b border-slate-200/80 px-3 py-2 ${align} text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:text-slate-300">${th}</th>`;
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody class="divide-y divide-slate-100 bg-white dark:divide-white/5 dark:bg-[#15131F]">';
    dataRows.forEach((row, rowIdx) => {
        const cells = row.split('|').slice(1, -1).map((c) => c.trim());
        const bgClass = rowIdx % 2 === 1 ? 'bg-slate-50/50 dark:bg-white/[0.02]' : '';
        html += `<tr class="${bgClass} transition-colors hover:bg-lime-50/60 dark:hover:bg-white/[0.05]">`;
        cells.forEach((td, idx) => {
            let align = aligns[idx] || 'text-left';
            let extraClass = '';
            if (td.startsWith('Rp') || /^-?\d[\d.,]*%?$/.test(td)) {
                align = 'text-right text-sikas-num font-mono font-semibold';
                extraClass = 'whitespace-nowrap';
            }
            html += `<td class="px-3 py-2 text-slate-700 dark:text-slate-200 ${align} ${extraClass}">${td}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';

    return html;
}

function parseMarkdownTables(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];

    const isTableRow = (l: string) => /^\s*\|(.+)\|\s*$/.test(l);
    const isDelimiterRow = (l: string) => /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(l);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (isTableRow(line)) {
            if (!inTable && i + 1 < lines.length && isDelimiterRow(lines[i + 1])) {
                inTable = true;
                tableRows = [line];
            } else if (inTable) {
                tableRows.push(line);
            } else {
                result.push(line);
            }
        } else {
            if (inTable) {
                result.push(renderParsedTable(tableRows));
                inTable = false;
                tableRows = [];
            }
            result.push(line);
        }
    }

    if (inTable && tableRows.length > 0) {
        result.push(renderParsedTable(tableRows));
    }

    return result.join('\n');
}

export function sanitizeAndFormatHtml(content: string): string {
    if (!content) return '';

    // 1. Strip markdown code fences around HTML or markdown table
    let processed = content
        .replace(/```(?:html|markdown|xml)?\s*([\s\S]*?)\s*```/gi, '$1')
        .replace(/```/g, '');

    // 2. Parse any markdown tables into styled Neo-Bento HTML tables
    processed = parseMarkdownTables(processed);

    // 3. Clean dangerous tags, event handlers (quoted, unquoted, slash-prefixed), and unsafe protocols
    processed = processed
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
        .replace(/[\s/]+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/\b(?:javascript|vbscript|data)\s*:/gi, '');

    // 4. Wrap any raw HTML <table> tags that are not already enclosed in an overflow container
    processed = processed.replace(
        /(<div class="[^"]*overflow-x-auto[^"]*">[\s\S]*?<\/table><\/div>)|(<table[\s\S]*?<\/table>)/gi,
        (_match, alreadyWrapped, unwrappedTable) => {
            if (alreadyWrapped) {
                return alreadyWrapped;
            }
            return `<div class="${TABLE_WRAPPER_CLASS}">${unwrappedTable}</div>`;
        },
    );

    // 5. Convert markdown headers
    processed = processed.replace(
        /^###\s+(.+)$/gm,
        '<h6 class="mt-2.5 mb-1 text-xs font-extrabold text-slate-900 dark:text-white">$1</h6>',
    );
    processed = processed.replace(
        /^##\s+(.+)$/gm,
        '<h5 class="mt-3 mb-1.5 text-[13px] font-extrabold text-slate-900 dark:text-white">$1</h5>',
    );

    // 6. Markdown bold **text**
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 7. Markdown bullet points
    processed = processed.replace(
        /(?:^|\n)[-*]\s+(.+)/g,
        '<div class="my-1 ml-0.5 flex items-start gap-2 text-xs"><span class="mt-0.5 font-extrabold text-brand-500 dark:text-lime-300">•</span><span>$1</span></div>',
    );

    // 8. Line breaks outside HTML tags
    processed = processed
        .replace(/\n\n+/g, '<div class="my-1.5"></div>')
        .replace(/(?<!>)\n(?!<)/g, '<br/>');

    return processed;
}

export const COPILOT_HTML_STYLES = `
.ai-html-content table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.725rem;
    line-height: 1.25rem;
}
.ai-html-content thead {
    position: sticky;
    top: 0;
    z-index: 10;
}
.ai-html-content th {
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: rgba(248, 250, 252, 0.98);
    backdrop-filter: blur(6px);
    color: #475569;
    font-weight: 800;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 7px 10px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
}
.dark .ai-html-content th {
    background-color: rgba(29, 27, 43, 0.98);
    color: #cbd5e1;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.ai-html-content td {
    padding: 7px 10px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
}
.dark .ai-html-content td {
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: #e2e8f0;
}
.ai-html-content tr:last-child td {
    border-bottom: none;
}
.ai-html-content tr:hover td {
    background-color: rgba(248, 253, 232, 0.65);
}
.dark .ai-html-content tr:hover td {
    background-color: rgba(255, 255, 255, 0.04);
}
.ai-html-content p {
    margin-bottom: 0.45rem;
}
.ai-html-content p:last-child {
    margin-bottom: 0;
}
.ai-html-content ul {
    list-style-type: disc;
    padding-left: 1.25rem;
    margin-bottom: 0.45rem;
}
.ai-html-content ol {
    list-style-type: decimal;
    padding-left: 1.25rem;
    margin-bottom: 0.45rem;
}
.ai-html-content li {
    margin-bottom: 0.25rem;
}
.ai-html-content strong {
    font-weight: 700;
    color: #0f172a;
}
.dark .ai-html-content strong {
    color: #ffffff;
}
.ai-html-content code {
    background-color: rgba(124, 92, 255, 0.08);
    color: #4f46e5;
    padding: 0.1rem 0.35rem;
    border-radius: 0.4rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.7rem;
}
.dark .ai-html-content code {
    background-color: rgba(124, 92, 255, 0.18);
    color: #c4b5fd;
}
.copilot-maximized .ai-html-content .overflow-y-auto {
    max-height: 55vh;
}
`;
