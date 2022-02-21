import hljs from 'highlight.js';
import * as markdownParserFactory from 'markdown-it';
import taskLists from '@hedgedoc/markdown-it-task-lists';
import anchors from 'markdown-it-anchor';

// Try include type definitions for these libraries.
const toc = require('markdown-it-table-of-contents');
const attrs = require('markdown-it-attrs');

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

export const parser = markdownParserFactory({ highlight })
  .use(taskLists, { label: true, labelAfter: true, lineNumber: true })
  .use(toc, { markerPattern: /^\[TOC\]/im, includeLevel: [1, 2, 3, 4, 5] })
  .use(anchors)
  .use(attrs);