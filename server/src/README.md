# Server source

`main.ts` bootstraps Nest, sets the `/api` prefix, enables CORS, and installs the global validation pipe. `app.module.ts` registers configuration, scheduling, and the four functional modules.

The server modules are deliberately small and independent. Controllers define HTTP contracts; services contain parsing, document generation, external-provider fallback, or privileged worker behavior. Shared server errors live in `common/`.
