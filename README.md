# Pixiu

A Chrome extension that shows your Claude plan usage as a Tamagotchi-style virtual pet. The design handoff is in [docs/](docs/README.md).

## Status

Milestone 1 of [docs/PLAN.md](docs/PLAN.md): the extension reads usage in the background and the popup shows the raw numbers. There is no pet yet.

## Develop

Needs Node and pnpm.

```bash
pnpm install
pnpm build
```

Then open `chrome://extensions`, turn on Developer mode, choose "Load unpacked", and select `.output/chrome-mv3`. Open claude.ai once so the extension can find your account.

| Command | What it does |
|---|---|
| `pnpm dev` | Builds on change and reloads the extension in a fresh browser profile. |
| `pnpm build` | Production build into `.output/chrome-mv3`. |
| `pnpm test` | Unit tests. |
| `pnpm typecheck` | Type check. |
| `pnpm lint` | Lint and format check. `pnpm format` fixes what it can. |

## Layout

| Path | What it holds |
|---|---|
| `src/entrypoints/background.ts` | The background worker. Polls usage and saves each snapshot. |
| `src/entrypoints/content.ts` | Runs on claude.ai and learns the organization ID. |
| `src/entrypoints/popup/` | The popup. |
| `src/lib/usage/` | The normalized usage snapshot and the Claude adapter that produces it. |
| `src/lib/store.ts` | The one place that reads and writes `chrome.storage.local`. |
