import hljs from 'highlight.js';
import * as markdownParserFactory from 'markdown-it';
import taskLists from '@hedgedoc/markdown-it-task-lists';
import anchors from 'markdown-it-anchor';

// Try include type definitions for this lib.
const toc = require('markdown-it-table-of-contents');

export interface MarkdownParser {
  render: (markdownContent: string) => string;
  utils: {
    escapeHtml: (str: string) => string;
  }
}

const highlight = (str: string, lang: string): string => {
  if (!lang || !hljs.getLanguage(lang)) {
    return parser.utils.escapeHtml(str);
  }

  try {
    const { value } = hljs.highlight(str, { 
      language: lang,
      ignoreIllegals: true
    });

    return value;
  } catch (__) {}

  return '';
}

export const parser: MarkdownParser = markdownParserFactory({ highlight })
  .use(taskLists, { label: true, labelAfter: true, lineNumber: true })
  .use(toc, { markerPattern: /^\[TOC\]/im, includeLevel: [1, 2, 3] })
  .use(anchors);