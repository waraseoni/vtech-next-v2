const baseURL = process.env.LHCI_BASE_URL ?? "http://localhost:3000";
const authed = process.env.LHCI_AUTHED === "1";

const urls = authed
  ? [`${baseURL}/dashboard`, `${baseURL}/jobs`, `${baseURL}/clients`]
  : [`${baseURL}/login`];

module.exports = {
  ci: {
    collect: {
      url: urls,
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        ...(authed ? {} : { chromeFlags: "--no-sandbox --headless=new" }),
      },
      ...(authed
        ? {
            puppeteerScript: "./scripts/lhci-auth.cjs",
            puppeteerLaunchOptions: {
              args: ["--no-sandbox", "--headless=new"],
            },
          }
        : {}),
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.75 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": "off",
        "uses-http2": "off",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lighthouse-reports",
    },
  },
};
