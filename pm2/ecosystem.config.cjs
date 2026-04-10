module.exports = {
  apps: [
    {
      name: "godmode-core-tools-bridge",
      cwd: "..",
      script: "python",
      args: "core_tools_bridge.py",
      interpreter: "none",
      env: {
        DEVTOOLS_BRIDGE_HOST: "0.0.0.0",
        DEVTOOLS_BRIDGE_PORT: "3911",
        DEVTOOLS_BRIDGE_COMMAND_TIMEOUT: "900",
        DEVTOOLS_FRONTEND_DIR: "./CoronaProjektschonwieder",
      },
    },
    {
      name: "godmode-frontend-preview",
      cwd: "../CoronaProjektschonwieder",
      script: "npm",
      args: "run preview -- --host 0.0.0.0 --port 4173",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
