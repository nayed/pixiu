# Pixiu

A Chrome extension that shows your Claude plan usage as a Tamagotchi-style virtual pet. The design handoff is in [docs/](docs/README.md).

## Status

Milestones 1 and 2 of [docs/PLAN.md](docs/PLAN.md): the extension reads usage in the background and runs the pet engine on every read. The popup still shows raw numbers and the pet's state as text. The drawn pet comes next.

To see states that take weeks to reach, open the popup and choose "Debug". That page runs the engine against a pretend Claude and a pretend clock.

Removing the extension deletes the pet, because Chrome deletes the extension's storage. Reloading it does not. Before removing it, export the pet from the debug page, then import the file afterward.

## Develop

Needs Node and pnpm.

```bash
pnpm install
pnpm build
```

Then open `chrome://extensions`, turn on Developer mode, choose "Load unpacked", and select `.output/chrome-mv3`. Open claude.ai once so the extension can find your account.

| Command          | What it does                                                           |
| ---------------- | ---------------------------------------------------------------------- |
| `pnpm dev`       | Builds on change and reloads the extension in a fresh browser profile. |
| `pnpm build`     | Production build into `.output/chrome-mv3`.                            |
| `pnpm test`      | Unit tests.                                                            |
| `pnpm typecheck` | Type check.                                                            |
| `pnpm lint`      | Lint and format check. `pnpm format` fixes what it can.                |

## Layout

| Path                            | What it holds                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `src/entrypoints/background.ts` | The background worker. Polls usage, runs the engine, and saves the pet.              |
| `src/entrypoints/content.ts`    | Runs on claude.ai and learns the organization ID.                                    |
| `src/entrypoints/popup/`        | The popup.                                                                           |
| `src/entrypoints/debug/`        | The debug page.                                                                      |
| `src/lib/usage/`                | The normalized usage snapshot and the Claude adapter that produces it.               |
| `src/lib/pet/`                  | The pet: rule constants, state, the engine step, and the view every surface renders. |
| `src/lib/sim/`                  | A fake Claude and clock, for the tests and the debug page.                           |
| `src/lib/backup.ts`             | The backup file format: export, validation, and import.                              |
| `src/lib/store.ts`              | The one place that reads and writes `chrome.storage.local`.                          |
