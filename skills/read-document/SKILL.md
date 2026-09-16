---
description: Read a PDF, Word, PowerPoint, Excel, EPUB, Outlook .msg, ZIP, or other binary document as Markdown — including legacy .doc/.ppt and scanned PDFs that need OCR. Use whenever a file that is not plain text needs to be read: an attachment the user dropped into the conversation, a path they mention, or a document URL, instead of opening it with Read, cat, or head.
---

# Read a document as Markdown

`Read` and `cat` see the raw bytes of a `.pdf`, `.docx`, `.pptx` or `.xlsx`, not
its text. Convert the file first and read the Markdown.

There are two routes. Start with the MCP tool; fall back to `doc2md` for the
cases it cannot handle.

## 1. The markitdown MCP tool — the default

Call `convert_to_markdown` with a single `uri` argument:

- **Local file** — an absolute `file://` URI:
  `file:///Users/me/reports/lhr-2025.pdf`
  Percent-encode spaces and other reserved characters: `Laporan Akhir.pdf`
  becomes `file:///Users/me/Laporan%20Akhir.pdf`.
- **On the web** — pass the `http://` or `https://` URL directly. The server
  fetches it; no need to download it first.

Resolve relative paths against the working directory before calling, and use
`ls` if you are unsure a path exists.

Handles: PDF · Word `.docx` · PowerPoint `.pptx` · Excel `.xlsx` and `.xls` ·
CSV · EPUB · Outlook `.msg` and `.eml` · HTML · RSS/Atom · Jupyter `.ipynb` ·
JSON and XML · ZIP (each entry in turn) · images and audio (metadata, and
transcription where a speech backend is configured).

Tables come back as Markdown tables, so spreadsheet and PDF tables stay
readable. Worksheets arrive in workbook order, each under its own heading.

## 2. `doc2md` — for what the tool refuses

`doc2md` is on `PATH` while this plugin is enabled. Run it through Bash:

```bash
doc2md "/path/to/Laporan Akhir.doc"          # a plain path, no URI encoding
doc2md --ocr force --lang ind scan.pdf       # re-OCR even if a text layer exists
doc2md --ocr off report.pdf                  # never OCR
```

It writes Markdown to stdout and progress notes to stderr, and it passes
ordinary files straight through to markitdown — so it is safe to reach for when
you are not sure what you are holding.

Use it in these two cases:

**Legacy binary Office formats.** `.doc`, `.ppt`, `.odt`, `.odp`, `.ods`, `.rtf`
make the MCP tool fail with *"the filetype is simply not supported"*. `doc2md`
converts them to the modern format with LibreOffice first, then reads that.

**A PDF that converts to nothing.** A scan has no text layer, so the MCP tool
returns an empty or near-empty result. `doc2md` detects this (under ~50
characters per page), runs OCR, and converts again. Default OCR language is
`ind+eng`; override with `--lang`.

If `doc2md` reports a missing tool, relay its message — it names the exact
install command — rather than reporting the document as unreadable.

## Limits worth knowing

- **OCR output is not clean data.** Verify every figure you intend to quote
  against the page image. In testing, `Golongan I` came back as `Golongan |`
  while the numbers around it were correct — that class of error is easy to miss
  and changes meaning. Say explicitly when a number came from OCR.
- **The OCR fallback loses layout.** When `ocrmypdf` is available the text is
  written back into the PDF and structure survives; without it, `doc2md`
  rasterises and OCRs page by page, which yields plain text with `<!-- page N -->`
  markers and no tables.
- **A legacy conversion is a round trip**, and round trips lose things —
  numbering, footnotes, and complex table layouts most of all. Treat the result
  as readable text, not as a faithful copy.
- **`.pages`, `.numbers`, `.key` are not supported** by either route. Ask for an
  exported `.docx`/`.xlsx`/`.pptx` or PDF.
- **Layout is flattened to a linear reading order.** Multi-column pages, text
  boxes, and figure captions can end up out of order, and page numbers are lost
  except where the OCR fallback adds them, so verify before citing "page N".
- **Large documents return a lot of text at once.** Convert once, then work from
  that output instead of re-converting.

## Reporting back

Quote or summarise from the converted Markdown, and say which file it came from.
When a number matters — a cost, a volume, a date — check it against the
converted text rather than from memory, and flag anything the conversion may
have mangled (merged cells, footnotes, figures, anything from OCR) instead of
presenting it as clean data.
