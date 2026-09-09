# Receipts

The receipts page accepts image files and scanned PDFs through a dropzone. In Supabase mode, it uploads the original file to the private `receipts` Storage bucket and creates a `receipts` row in `processing` state before it submits the file to the optional `/api/ocr/parse` endpoint. Demo mode persists the OCR metadata locally but not the original binary file.

OCR is intentionally a review workflow: the result may suggest a merchant, date, currency, total, or category, but it does not create a transaction automatically. The review modal lets the user correct those values and explicitly create a linked transaction. The server limits files to 10 MB and PDFs to 10 pages. `styles/receipts.css` contains the feature-specific visual treatment.
