// ============================================================
// Markdown + LaTeX renderer
// Port from public/js/markdown-renderer.js
// ============================================================

declare global {
  interface Window {
    marked: {
      setOptions: (opts: object) => void;
      parse: (text: string) => string;
    };
    DOMPurify: {
      sanitize: (
        html: string,
        opts?: { ADD_TAGS?: string[]; ADD_ATTR?: string[]; ALLOW_DATA_ATTR?: boolean }
      ) => string;
    };
    katex: {
      renderToString: (
        tex: string,
        opts?: { displayMode?: boolean; throwOnError?: boolean }
      ) => string;
    };
  }
}

const KATEX_MATH_TAGS = [
  'annotation', 'semantics', 'math', 'mrow', 'msup', 'munder', 'mover',
  'mfrac', 'msqrt', 'mtable', 'mtr', 'mtd', 'mtext', 'mn', 'mo', 'mi',
  'mspace', 'mpadded', 'mstyle', 'menclose',
];

const KATEX_MATH_ATTRS = [
  'encoding', 'class', 'displaystyle', 'scriptlevel', 'mathvariant', 'fence',
  'separator', 'stretchy', 'symmetric', 'maxsize', 'minsize', 'largeop',
  'movablelimits', 'accent', 'lspace', 'rspace', 'linethickness', 'columnalign',
  'rowalign', 'columnlines', 'rowlines', 'frame', 'framespacing', 'equalrows',
  'equalcolumns', 'side', 'minlabelspacing',
];

// Whether window.marked + window.katex + window.DOMPurify are loaded
function hasMarkdown(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.marked !== 'undefined' &&
    typeof window.DOMPurify !== 'undefined';
}

// Simple fallback: just escape HTML entities
function escapeHtmlFallback(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render markdown text to sanitized HTML.
 * Uses marked.js + KaTeX + DOMPurify when loaded on window.
 * Falls back to basic HTML escape when not loaded.
 */
export function renderMarkdown(text: string): string {
  if (!text) return '';

  if (!hasMarkdown()) {
    // Fallback: basic newline→<br> rendering
    return escapeHtmlFallback(text).replace(/\n/g, '<br>');
  }

  const placeholders: string[] = [];
  let processed = text;

  // Extract LaTeX BEFORE marked.js to prevent HTML entity corruption
  if (typeof window.katex !== 'undefined') {
    // Block LaTeX: $$...$$
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
      const id = `%%LATEX_${placeholders.length}%%`;
      try {
        placeholders.push(
          `<span class="katex-wrap">${window.katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })}</span>`
        );
      } catch {
        placeholders.push(`<code>${escapeHtmlFallback(tex)}</code>`);
      }
      return id;
    });

    // Inline LaTeX: $...$
    processed = processed.replace(/\$([^\$]+?)\$/g, (_, tex) => {
      const id = `%%LATEX_${placeholders.length}%%`;
      try {
        placeholders.push(
          `<span class="katex-wrap">${window.katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })}</span>`
        );
      } catch {
        placeholders.push(`<code>${escapeHtmlFallback(tex)}</code>`);
      }
      return id;
    });
  }

  // Run marked.js
  const sanitizeOpts1 = {
    ADD_TAGS: KATEX_MATH_TAGS,
    ADD_ATTR: KATEX_MATH_ATTRS,
    ALLOW_DATA_ATTR: false,
  };
  let html = window.DOMPurify.sanitize(
    window.marked.parse(processed),
    sanitizeOpts1
  );

  // Re-insert rendered LaTeX
  html = html.replace(/%%LATEX_(\d+)%%/g, (_, i) => placeholders[Number(i)] ?? '');

  // Final sanitization (defense in depth after LaTeX re-insertion)
  html = window.DOMPurify.sanitize(html, {
    ADD_TAGS: [...KATEX_MATH_TAGS, 'span'],
    ADD_ATTR: [
      ...KATEX_MATH_ATTRS,
      'style', 'aria-hidden', 'height', 'width', 'xmlns', 'viewBox', 'fill',
    ],
    ALLOW_DATA_ATTR: false,
  });

  return html;
}

/** Initialize marked.js options (call once on mount) */
export function initMarked(): void {
  if (typeof window !== 'undefined' && typeof window.marked !== 'undefined') {
    window.marked.setOptions({ breaks: true, gfm: true });
  }
}
