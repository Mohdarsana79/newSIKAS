<?php

namespace App\Support;

class PdfHtmlSanitizer
{
    /** @var array<int, string> */
    private const ALLOWED_KOP_TAGS = [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
        'sub', 'sup', 'span', 'mark', 'h1', 'h2', 'h3', 'ul', 'ol', 'li',
    ];

    /** @var array<int, string> */
    private const ALLOWED_CSS_PROPERTIES = [
        'text-align',
        'font-family',
        'font-size',
        'line-height',
        'color',
        'background-color',
        'font-weight',
        'font-style',
        'text-decoration',
    ];

    /**
     * Bersihkan karakter Unicode tak terlihat (UTF-8 BOM, zero-width, directional/isolate marks,
     * replacement char) serta normalisasi karakter non-WinAnsi tertentu (minus sign, non-breaking
     * hyphen, thin spaces) yang oleh DomPDF Helvetica/Arial dirender menjadi tanda tanya literal '?'.
     *
     * Sengaja tidak mengubah tanda kutip lengkung menjadi kutip ASCII mentah pada HTML penuh
     * agar tidak merusak pembatas atribut HTML (mis. alt="Logo “Resmi”").
     */
    public static function sanitizeHtml(string $html): string
    {
        if ($html === '') {
            return '';
        }

        // Bersihkan byte UTF-8 rusak terlebih dahulu agar regex /u tidak gagal (PREG_BAD_UTF8_ERROR)
        $cleaned = @iconv('UTF-8', 'UTF-8//IGNORE', $html);
        if (! is_string($cleaned)) {
            $cleaned = $html;
        }

        // Hapus entitas HTML untuk karakter tak terlihat & replacement char
        $cleaned = preg_replace(
            '/&#(?:65279|x0*FEFF|8203|x0*200B|8204|x0*200C|8205|x0*200D|8206|x0*200E|8207|x0*200F|8234|8235|8236|8237|8238|x0*202[A-E]|8288|8289|8290|8291|8292|x0*206[0-4]|8294|8295|8296|8297|x0*206[6-9]|173|x0*AD|65533|x0*FFFD);|&(?:ZeroWidthSpace|zwnj|zwj|lrm|rlm|shy);/i',
            '',
            $cleaned
        ) ?? $cleaned;

        // Normalisasi entitas minus sign (&minus; / &#8722; / &#x2212;) dan non-breaking hyphen (&#8209; / &#x2011;)
        $cleaned = preg_replace(
            '/&minus;|&#(?:8722|x0*2212|8209|x0*2011);/i',
            '-',
            $cleaned
        ) ?? $cleaned;

        // Hapus karakter Unicode tak terlihat, kontrol bidi/isolate, soft hyphen, dan U+FFFD
        $cleaned = preg_replace(
            '/[\x{FEFF}\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{2069}\x{00AD}\x{FFFD}]/u',
            '',
            $cleaned
        ) ?? $cleaned;

        // Normalisasi karakter non-WinAnsi yang pasti menjadi '?' di DomPDF Helvetica/Arial
        return strtr($cleaned, [
            "\u{2011}" => '-',
            "\u{2212}" => '-',
            "\u{2007}" => ' ',
            "\u{2009}" => ' ',
            "\u{200A}" => ' ',
            "\u{202F}" => ' ',
        ]);
    }

    /**
     * Sanitasi HTML kop surat (dari Tiptap Kop Builder) dengan allowlist tag & properti CSS
     * berbasis DOMDocument (aman dari XSS, PDF-JS, dan ReDoS), lalu memangkas blok kosong
     * di awal dan akhir kop termasuk format bersarang (<p><span><br></span></p>).
     */
    public static function sanitizeKopHtml(string $html): string
    {
        $cleaned = trim(self::sanitizeHtml($html));
        if ($cleaned === '') {
            return '';
        }

        $dom = new \DOMDocument('1.0', 'UTF-8');
        $prevErrors = libxml_use_internal_errors(true);

        try {
            $dom->loadHTML(
                '<?xml encoding="UTF-8"><div id="sikas-kop-root">'.$cleaned.'</div>',
                LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING
            );
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($prevErrors);
        }

        $root = null;
        foreach ($dom->childNodes as $child) {
            if ($child instanceof \DOMElement && $child->getAttribute('id') === 'sikas-kop-root') {
                $root = $child;
                break;
            }
        }

        if (! $root instanceof \DOMElement) {
            return '';
        }

        self::sanitizeNodeChildren($root, $dom);
        self::trimEmptyEdgeNodes($root);

        $output = '';
        foreach ($root->childNodes as $child) {
            $output .= $dom->saveHTML($child);
        }

        return trim($output);
    }

    protected static function sanitizeNodeChildren(\DOMNode $parent, \DOMDocument $dom): void
    {
        $children = [];
        foreach ($parent->childNodes as $child) {
            $children[] = $child;
        }

        foreach ($children as $child) {
            if ($child instanceof \DOMComment) {
                $parent->removeChild($child);

                continue;
            }

            if (! $child instanceof \DOMElement) {
                continue;
            }

            $tag = strtolower($child->tagName);

            // Hapus elemen berbahaya beserta seluruh isinya
            if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'form', 'input', 'button', 'link', 'meta'], true)) {
                $parent->removeChild($child);

                continue;
            }

            // Sanitasi anak terlebih dahulu sebelum keputusan unwrap
            self::sanitizeNodeChildren($child, $dom);

            if (! in_array($tag, self::ALLOWED_KOP_TAGS, true)) {
                // Unwrap tag tidak dikenal (pertahankan teks/anak aman di dalamnya)
                while ($child->firstChild !== null) {
                    $parent->insertBefore($child->firstChild, $child);
                }
                $parent->removeChild($child);

                continue;
            }

            // Hanya izinkan atribut `style` yang telah disaring propertinya
            $safeStyle = '';
            if ($child->hasAttribute('style')) {
                $safeStyle = self::sanitizeInlineStyle($child->getAttribute('style'));
            }

            $attrNames = [];
            foreach ($child->attributes as $attr) {
                $attrNames[] = $attr->name;
            }
            foreach ($attrNames as $attrName) {
                $child->removeAttribute($attrName);
            }

            if ($safeStyle !== '') {
                $child->setAttribute('style', $safeStyle);
            }
        }
    }

    protected static function sanitizeInlineStyle(string $rawStyle): string
    {
        $safeDeclarations = [];
        $allowedLookup = array_fill_keys(self::ALLOWED_CSS_PROPERTIES, true);

        foreach (explode(';', $rawStyle) as $declaration) {
            $declaration = trim($declaration);
            if ($declaration === '' || ! str_contains($declaration, ':')) {
                continue;
            }

            [$prop, $val] = explode(':', $declaration, 2);
            $prop = strtolower(trim($prop));
            $val = trim($val);

            if (! isset($allowedLookup[$prop]) || $val === '') {
                continue;
            }

            // Tolak url(), expression(), @import, javascript:, atau karakter kontrol berbahaya
            if (preg_match('/(?:url\s*\(|expression\s*\(|javascript\s*:|@import|behavior\s*:|[\x00-\x1F])/i', $val)) {
                continue;
            }

            $safeDeclarations[] = "{$prop}: {$val}";
        }

        return implode('; ', $safeDeclarations);
    }

    protected static function trimEmptyEdgeNodes(\DOMElement $root): void
    {
        while ($root->firstChild !== null && self::isEmptyNode($root->firstChild)) {
            $root->removeChild($root->firstChild);
        }

        while ($root->lastChild !== null && self::isEmptyNode($root->lastChild)) {
            $root->removeChild($root->lastChild);
        }
    }

    protected static function isEmptyNode(\DOMNode $node): bool
    {
        if ($node instanceof \DOMText) {
            $stripped = preg_replace('/[\s\x{00A0}]+/u', '', $node->nodeValue ?? '');

            return $stripped === '';
        }

        if (! $node instanceof \DOMElement) {
            return true;
        }

        $text = preg_replace('/[\s\x{00A0}]+/u', '', $node->textContent ?? '');

        return $text === '';
    }
}
