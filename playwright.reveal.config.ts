import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

const revealOnly = /@capture-reveal/;

export default defineConfig({
  ...baseConfig,
  projects: [
    {
      name: "chromium-reveal",
      grep: revealOnly,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit-reveal",
      grep: revealOnly,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome-reveal",
      grep: revealOnly,
      use: { ...devices["Pixel 5"] },
    },
  ],
});
