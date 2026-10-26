import { defineConfig, minimal2023Preset, type Preset } from "@vite-pwa/assets-generator/config";

// The source SVG is a full tile, so padded icons get the same teal behind them.
const TEAL = "#0b6e69";

const preset: Preset = {
  ...minimal2023Preset,
  maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: TEAL } },
  apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: TEAL } },
};

export default defineConfig({
  preset,
  images: ["public/icons/icon.svg"],
});
