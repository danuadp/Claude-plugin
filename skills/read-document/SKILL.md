---
description: Read a PDF, Word, PowerPoint, Excel, EPUB, Outlook .msg, ZIP, or other binary document as Markdown, via the bundled markitdown MCP server. Use whenever a file that is not plain text needs to be read — an attachment the user dropped into the conversation, a path they mention, or a document URL — instead of opening it with Read, cat, or head.
---

# Read a document as Markdown

`Read` and `cat` see the raw bytes of a `.pdf`, `.docx`, `.pptx` or `.xlsx`, not
its text. Convert the file first and read the Markdown.

## How

Call the markitdown server's `convert_to_markdown` tool with a single `uri`
argument. It returns the whole document as Markdown.

- **Local file** — an absolute `file://` URI:
  `file:///Users/me/reports/lhr-2025.pdf`
  Percent-encode spaces and other reserved characters: `Laporan Akhir.pdf`
  becomes `file:///Users/me/Laporan%20Akhir.pdf`.
- **On the web** — pass the `http://` or `https://` URL directly. The server
  fetches it; no need to download it first.

Resolve relative paths against the working directory before calling, and use
`ls` if you are unsure a path exists — the error you get back for a missing file
is terse.

## What it handles

PDF · Word `.docx` · PowerPoint `.pptx` · Excel `.xlsx` and `.xls` · CSV · EPUB ·
Outlook `.msg` and `.eml` · HTML · RSS/Atom · Jupyter `.ipynb` · JSON and XML ·
ZIP (each entry converted in turn) · images and audio (metadata, and audio
transcription where a speech backend is configured).

Tables come back as Markdown tables, so spreadsheet and PDF tables stay
readable. Worksheets arrive in workbook order, each under its own sheet heading.

## Limits worth knowing

- **Legacy binary Office formats — `.doc`, `.ppt` — are not supported**, and
  neither are `.pages`, `.numbers`, `.key`. A `.doc` does not fail cleanly: it
  comes back as a short run of mojibake. Treat unreadable output on those
  extensions as "unsupported format", say so, and ask for a `.docx`/`.pptx`
  copy rather than guessing at the contents.
- A scanned PDF with no text layer converts to almost nothing. If the output is
  empty or nearly so, say the document looks like a scan and needs OCR — do not
  report it as an empty document.
- Layout is flattened to a linear reading order. Multi-column pages, text boxes,
  and figure captions can end up out of order, and page numbers are lost, so
  verify before citing anything as "page N".
- Large documents return a lot of text at once. Convert once, then work from
  that output instead of re-converting.

## Reporting back

Quote or summarise from the converted Markdown, and say which file it came from.
When a number matters — a cost, a volume, a date — check it against the
converted text rather than from memory, and flag anything the conversion may
have mangled (merged cells, footnotes, figures) instead of presenting it as
clean data.
