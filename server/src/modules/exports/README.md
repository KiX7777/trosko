# Exports module

The exports module exposes `GET /api/export/pdf`. The controller parses the optional JSON rows query parameter and the service produces a small PDF with title, generation timestamp, and one line per transaction row.

This endpoint is intentionally a presentation export, not a financial reporting engine. If the export grows to support large datasets, move data selection server-side instead of placing an unbounded JSON payload in the URL.
