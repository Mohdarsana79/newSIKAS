import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (fontSize: string) => ReturnType;
            unsetFontSize: () => ReturnType;
        };
        lineHeight: {
            setLineHeight: (lineHeight: string) => ReturnType;
            unsetLineHeight: () => ReturnType;
        };
    }
}

export const FontSize = Extension.create({
    name: 'fontSize',

    addOptions() {
        return {
            types: ['textStyle'],
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) => element.style.fontSize || null,
                        renderHTML: (attributes) => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            };
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            setFontSize:
                (fontSize: string) =>
                ({ chain }) => {
                    return chain().setMark('textStyle', { fontSize }).run();
                },
            unsetFontSize:
                () =>
                ({ chain }) => {
                    return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
                },
        };
    },
});

export const LineHeight = Extension.create({
    name: 'lineHeight',

    addOptions() {
        return {
            types: ['paragraph', 'heading'],
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    lineHeight: {
                        default: null,
                        parseHTML: (element) => element.style.lineHeight || null,
                        renderHTML: (attributes) => {
                            if (!attributes.lineHeight) {
                                return {};
                            }
                            return {
                                style: `line-height: ${attributes.lineHeight}`,
                            };
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            setLineHeight:
                (lineHeight: string) =>
                ({ commands }) => {
                    return this.options.types.every((type: string) =>
                        commands.updateAttributes(type, { lineHeight })
                    );
                },
            unsetLineHeight:
                () =>
                ({ commands }) => {
                    return this.options.types.every((type: string) =>
                        commands.resetAttributes(type, 'lineHeight')
                    );
                },
        };
    },
});

/**
 * Helper untuk mengubah case teks yang diseleksi (UPPERCASE, lowercase, Capitalize)
 */
export const applyTextCase = (
    editor: any,
    caseType: 'uppercase' | 'lowercase' | 'capitalize'
) => {
    if (!editor) return;

    const { state, view } = editor;
    const { from, to } = state.selection;

    if (from === to) {
        // Jika tidak ada seleksi teks, ubah teks pada baris/node aktif saat ini
        const node = state.selection.$from.parent;
        const start = state.selection.$from.start();
        const end = state.selection.$from.end();
        const currentText = node.textContent;
        if (!currentText) return;

        let transformed = currentText;
        if (caseType === 'uppercase') {
            transformed = currentText.toUpperCase();
        } else if (caseType === 'lowercase') {
            transformed = currentText.toLowerCase();
        } else if (caseType === 'capitalize') {
            transformed = currentText.replace(/\b\w/g, (char: string) => char.toUpperCase());
        }

        editor.chain().focus().insertContentAt({ from: start, to: end }, transformed).run();
        return;
    }

    const selectedText = state.doc.textBetween(from, to, ' ');
    if (!selectedText) return;

    let transformed = selectedText;
    if (caseType === 'uppercase') {
        transformed = selectedText.toUpperCase();
    } else if (caseType === 'lowercase') {
        transformed = selectedText.toLowerCase();
    } else if (caseType === 'capitalize') {
        transformed = selectedText.replace(/\b\w/g, (char: string) => char.toUpperCase());
    }

    editor.chain().focus().insertContentAt({ from, to }, transformed).run();
};

