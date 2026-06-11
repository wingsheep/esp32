import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    wled: "src/cli.ts",
  },
  format: ["esm"],
  platform: "node",
  dts: false,
  clean: true,
});
