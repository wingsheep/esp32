import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    wled: "src/cli.ts",
    "wled-server": "src/server.ts",
  },
  format: ["esm"],
  platform: "node",
  dts: false,
  clean: true,
});
