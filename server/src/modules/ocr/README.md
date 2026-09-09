# OCR module

The OCR module exposes `POST /api/ocr/parse`. It accepts an image or PDF upload up to 10 MB, renders PDFs at a readable scale, uses a reused Tesseract worker with Croatian and English language data, and passes recognized text to the receipt parser.

`ocr-parser.ts` is a pure heuristic parser. It identifies totals, dates, currencies, merchant-like lines, and category keywords, and returns a review-oriented result. It is covered by `ocr-parser.test.ts` and should stay independent from Nest and filesystem concerns.

The service limits PDFs to 10 pages, logs failures, terminates the Tesseract worker on module shutdown, and never persists a transaction. Set `OCR_LANG_PATH` for an offline language-data mirror.
