# Pixiu

A Chrome extension that shows your Claude plan usage as a Tamagotchi-style virtual pet. The design handoff is in [docs/](docs/README.md).

## Status

Milestones 1 to 6 of [docs/PLAN.md](docs/PLAN.md), which is all of version one: the extension reads usage in the background, runs the pet engine on every read, and shows the pet in the popup and on the toolbar icon, with a badge.

To see states that take weeks to reach, use the debug page. It runs the engine against a pretend Claude and a pretend clock, and shows the popup and the toolbar icon for the pretend pet. Release builds leave it out: run `pnpm build:debug`, load `.output/chrome-mv3-debug` as a second extension, open the popup's settings, and choose "Debug page". That second extension has its own storage, so it raises its own pet.

Removing the extension deletes the pet, because Chrome deletes the extension's storage. Reloading it does not. Before removing it, open the popup's settings, choose "Back up or restore", and export the pet to a file. Import that file afterward.

## Develop

Needs Node and pnpm.

```bash
pnpm install
pnpm build
```

Then open `chrome://extensions`, turn on Developer mode, choose "Load unpacked", and select `.output/chrome-mv3`. Open claude.ai once so the extension can find your account.

| Command            | What it does                                                           |
| ------------------ | ---------------------------------------------------------------------- |
| `pnpm dev`         | Builds on change and reloads the extension in a fresh browser profile. |
| `pnpm build`       | Release build into `.output/chrome-mv3`, without the debug page.       |
| `pnpm build:debug` | The same build with the debug page, into `.output/chrome-mv3-debug`.   |
| `pnpm zip`         | Release build, zipped for the Chrome Web Store.                        |
| `pnpm test`        | Unit tests.                                                            |
| `pnpm typecheck`   | Type check.                                                            |
| `pnpm lint`        | Lint and format check. `pnpm format` fixes what it can.                |

## Layout

| Path                                    | What it holds                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/entrypoints/background.ts`         | The background worker. Polls usage, runs the engine, and saves the pet.              |
| `src/entrypoints/content.ts`            | Runs on claude.ai and learns the organization ID.                                    |
| `src/entrypoints/popup/`                | The popup.                                                                           |
| `src/entrypoints/backup/`               | The backup page: export the pet to a file and import it again.                       |
| `src/entrypoints/debug/`                | The debug page. Left out of release builds.                                          |
| `src/lib/usage/`                        | The normalized usage snapshot and the Claude adapter that produces it.               |
| `src/lib/pet/`                          | The pet: rule constants, state, the engine step, and the view every surface renders. |
| `src/lib/sprites/`                      | The drawings as character grids, and the code that picks and paints them.            |
| `src/ui/`                               | The pet popup and the backup controls as components, shared with the debug page.     |
| `src/lib/sim/`                          | A fake Claude and clock, for the tests and the debug page.                           |
| `src/lib/backup.ts`                     | The backup file format: export, validation, and import.                              |
| `src/lib/icon.ts`, `src/lib/toolbar.ts` | Which icon and badge to show, and putting them on the toolbar.                       |
| `src/lib/store.ts`                      | The one place that reads and writes `chrome.storage.local`.                          |

## License

[MIT](LICENSE). The bundled fonts, Jersey 15 and VT323, are under the SIL Open Font License; their license texts are in `public/licenses/`.

Pixiu is a personal project. It is not made or endorsed by Anthropic, and it reads an undocumented claude.ai address that can change without notice.
