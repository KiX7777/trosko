# Receipts

The receipts page accepts image files and scanned PDFs through a dropzone. It submits them to the optional `/api/ocr/parse` server endpoint and displays extracted values for review.

OCR is intentionally a review workflow: the result may suggest a merchant, date, currency, total, or category, but it does not create a transaction automatically. The server limits files to 10 MB and PDFs to 10 pages. `styles/receipts.css` contains the feature-specific visual treatment.
