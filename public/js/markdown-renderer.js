marked.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(text) {
  // 1) Extract LaTeX BEFORE marked.js (prevents &quot; and other HTML entity corruption)
  const placeholders = [];
  let processed = text;

  // Block LaTeX: $$...$$
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    const id = `%%LATEX_${placeholders.length}%%`;
    try {
      placeholders.push(`<span class="katex-wrap">${katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })}</span>`);
    } catch (e) { placeholders.push(`<code>${tex}</code>`); }
    return id;
  });

  // Inline LaTeX: $...$ (allow newlines inside for multi-line LaTeX from AI)
  processed = processed.replace(/\$([^\$]+?)\$/g, (_, tex) => {
    const id = `%%LATEX_${placeholders.length}%%`;
    try {
      placeholders.push(`<span class="katex-wrap">${katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })}</span>`);
    } catch (e) { placeholders.push(`<code>${tex}</code>`); }
    return id;
  });

  // 2) Run marked.js on LaTeX-free text
  let html = DOMPurify.sanitize(marked.parse(processed), {
    ADD_TAGS: ['annotation', 'semantics', 'math', 'mrow', 'msup', 'munder', 'mover', 'mfrac', 'msqrt', 'mtable', 'mtr', 'mtd', 'mtext', 'mn', 'mo', 'mi', 'mspace', 'mpadded', 'mstyle', 'menclose'],
    ADD_ATTR: ['encoding', 'class', 'displaystyle', 'scriptlevel', 'mathvariant', 'fence', 'separator', 'stretchy', 'symmetric', 'maxsize', 'minsize', 'largeop', 'movablelimits', 'accent', 'lspace', 'rspace', 'linethickness', 'columnalign', 'rowalign', 'columnlines', 'rowlines', 'frame', 'framespacing', 'equalrows', 'equalcolumns', 'side', 'minlabelspacing'],
    ALLOW_DATA_ATTR: false,
  });

  // 3) Re-insert rendered LaTeX
  html = html.replace(/%%LATEX_(\d+)%%/g, (_, i) => placeholders[+i]);

  // SEC-011: LaTeX 삽입 후 최종 정제 (심층 방어)
  html = DOMPurify.sanitize(html, {
    ADD_TAGS: ['annotation', 'semantics', 'math', 'mrow', 'msup', 'munder', 'mover', 'mfrac', 'msqrt', 'mtable', 'mtr', 'mtd', 'mtext', 'mn', 'mo', 'mi', 'mspace', 'mpadded', 'mstyle', 'menclose', 'span'],
    ADD_ATTR: ['encoding', 'class', 'displaystyle', 'scriptlevel', 'mathvariant', 'fence', 'separator', 'stretchy', 'symmetric', 'maxsize', 'minsize', 'largeop', 'movablelimits', 'accent', 'lspace', 'rspace', 'linethickness', 'columnalign', 'rowalign', 'columnlines', 'rowlines', 'frame', 'framespacing', 'equalrows', 'equalcolumns', 'side', 'minlabelspacing', 'style', 'aria-hidden', 'height', 'width', 'xmlns', 'viewBox', 'fill'],
    ALLOW_DATA_ATTR: false,
  });

  return html;
}
