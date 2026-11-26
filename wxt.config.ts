import preact from "@preact/preset-vite";
import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  manifest: {
    name: "Pixiu",
    description: "Your Claude plan usage as a virtual pet.",
    permissions: ["storage", "alarms"],
    host_permissions: ["https://claude.ai/*"],
    action: { default_title: "Pixiu" },
    // The on-page overlay is this extension's own page, shown in a frame on claude.ai.
    web_accessible_resources: [{ resources: ["overlay.html"], matches: ["https://claude.ai/*"] }],
  },
  hooks: {
    // The debug and artboards pages are development tools. They are built by `pnpm dev` and
    // `pnpm build:debug` and left out of `pnpm build` and `pnpm zip`.
    "entrypoints:found": (wxt, infos) => {
      if (wxt.config.mode !== "production") return;
      const tools = new Set(["debug", "artboards"]);
      for (let index = infos.length - 1; index >= 0; index--) {
        if (tools.has(infos[index]?.name ?? "")) infos.splice(index, 1);
      }
    },
  },
  vite: () => ({ plugins: [preact()] }),
});
