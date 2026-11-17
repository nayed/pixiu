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
  },
  hooks: {
    // The debug page is a development tool. It is built by `pnpm dev` and `pnpm build:debug`
    // and left out of `pnpm build` and `pnpm zip`.
    "entrypoints:found": (wxt, infos) => {
      if (wxt.config.mode !== "production") return;
      const index = infos.findIndex((info) => info.name === "debug");
      if (index >= 0) infos.splice(index, 1);
    },
  },
  vite: () => ({ plugins: [preact()] }),
});
