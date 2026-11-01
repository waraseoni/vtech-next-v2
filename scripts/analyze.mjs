import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npx.cmd" : "npx";

const child = spawn(npm, ["next", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, ANALYZE: "true" },
});

child.on("exit", (code) => process.exit(code ?? 1));
