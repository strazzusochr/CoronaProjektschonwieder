const isWindows = process.platform === "win32";
const pythonInterpreter = isWindows ? "C:\\Windows\\py.exe" : "python3";
const npmCommand = isWindows ? "C:\\Program Files\\nodejs\\npm.cmd" : "npm";
const frontendScript = isWindows ? "C:\\Windows\\System32\\cmd.exe" : npmCommand;
const frontendArgs = isWindows
  ? "/c npm run preview -- --host 0.0.0.0 --port 4173"
  : "run preview -- --host 0.0.0.0 --port 4173";
const path = require("path");
const rootDir = path.resolve(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "godmode-core-tools-bridge",
      cwd: rootDir,
      script: "core_tools_bridge.py",
      interpreter: pythonInterpreter,
      env: {
        DEVTOOLS_BRIDGE_HOST: "0.0.0.0",
        DEVTOOLS_BRIDGE_PORT: "3911",
        DEVTOOLS_BRIDGE_COMMAND_TIMEOUT: "900",
        DEVTOOLS_FRONTEND_DIR: "./CoronaProjektschonwieder",
      },
    },
    {
      name: "godmode-frontend-preview",
      cwd: path.join(rootDir, "CoronaProjektschonwieder"),
      script: frontendScript,
      args: frontendArgs,
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
