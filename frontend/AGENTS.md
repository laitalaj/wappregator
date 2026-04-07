# Frontend

SolidJS single-page application for browsing and listening to Wappuradio stations.

## Tooling

- Runtime: Node.js v24 (LTS)
- Package manager: pnpm (version pinned in `package.json` `packageManager` field)
- Build tool: Vite
- Language: TypeScript (strict mode)
- Formatter: oxfmt (config in `.oxfmtrc.json`)
- Linter: oxlint (config in `.oxlintrc.json`) + ESLint with `eslint-plugin-solid`
- Lint: `pnpm lint` (runs `oxfmt src && oxlint src && eslint`)
- Dev server: `pnpm dev`
- Build: `pnpm build`

## Code style

- Indentation: tabs
- JS quote style: double quotes

## Dependencies

- `solid-js` - UI framework
- `socket.io-client` - real-time updates from backend
- `hls.js` - HLS audio streaming
- `date-fns` - date formatting
- `@tabler/icons-solidjs` - icons

## Source layout

Source code is in `src/`. Views are in `src/views/`, with shared components in `src/views/common/`. Styles use CSS modules (`.module.css` files).
