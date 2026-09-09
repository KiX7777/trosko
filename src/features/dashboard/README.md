# Dashboard

The dashboard is the default landing page after authentication. It combines the dashboard summary, account totals, recent transactions, recurring items, profile data, and daily expenses through `useDashboardQueries`.

Users can change the summary period (`7D`, `1M`, `3M`, `6M`, `1Y`, or custom), choose an expense month, inspect cash-flow charts, and jump into transactions or analytics. Keep aggregation logic in the repository so demo mode and Supabase mode present the same shape.
