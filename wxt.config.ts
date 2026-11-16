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
  vite: () => ({ plugins: [preact()] }),
});
