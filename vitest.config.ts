import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Sleeping hours are local time. Pin the zone so the tests give the same result anywhere.
    env: { TZ: "UTC" },
  },
});
