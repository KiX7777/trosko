# Exchange rates module

The module exposes `GET /api/exchange-rates`, with an optional `base` currency query parameter. If `EXCHANGE_RATES_ENDPOINT` is set, the service forwards the request to that provider and returns its JSON response. Provider failures are logged and return a small fallback rate object marked with `source: 'fallback'`.

Treat fallback rates as demo/development behavior. A production financial workflow should display the source and retrieval time and should not silently present stale rates as authoritative.
