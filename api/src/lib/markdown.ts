import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// Blog post bodies are authored as Markdown and rendered to HTML for the
// PUBLIC marketing site — the single highest-value XSS surface in the app.
// The rendering pipeline is deliberately two-staged and the sanitizer is the
// authority, not marked:
//
//   1. marked turns the stored Markdown into HTML. marked does NOT sanitize;
//      a body containing raw `<script>` or an `onerror=` attribute would pass
//      straight through it.
//   2. sanitize-html then strips everything not on the allowlist below —
//      every tag, every attribute, and (critically) any non-http(s)/mailto
//      URL scheme, which is what neutralises `javascript:` links and
//      `data:` payloads.
//
// The allowlist is intentionally small: the formatting a blog post needs and
// nothing that can execute. No <script>, <style>, <iframe>, <form>, event
// handlers, or inline styles survive it. This function is the ONLY sanctioned
// way to turn a stored body into HTML; callers must never render `body` raw.

const ALLOWED_TAGS = [
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "del",
  "code",
  "pre",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

export function renderMarkdown(markdown: string): string {
  // `async: false` keeps marked's return type a plain string (it can return a
  // Promise when async extensions are registered — none are here).
  const rawHtml = marked.parse(markdown, { async: false, gfm: true, breaks: true });

  return sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      // rel/target are allowed here so the transformTags rule below (which
      // stamps them onto every link) actually survives sanitization —
      // otherwise they'd be filtered right back off.
      a: ["href", "title", "rel", "target"],
      img: ["src", "alt", "title"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    // Only these URL schemes are permitted anywhere a URL can appear —
    // `javascript:`, `vbscript:`, and bare `data:` payloads are dropped.
    // Images additionally allow relative URLs (our own /uploads/... covers).
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    // Force every link to open safely: no reverse tabnabbing, and external
    // links can't manipulate window.opener.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
    },
    disallowedTagsMode: "discard",
  });
}
