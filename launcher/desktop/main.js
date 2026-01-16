const { app, BrowserWindow, nativeTheme } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

app.commandLine.appendSwitch("disable-http-cache");
app.commandLine.appendSwitch("disk-cache-size", "1");

const installRoot = process.env.P1LOT_ROOT || "C:\\Project-P1L0T";
const dataDir = process.env.P1LOT_DATA_DIR || path.join(installRoot, "data");
const logsDir = path.join(dataDir, "logs");
const appRoot = app.isPackaged ? path.join(process.resourcesPath, "launcher") : path.join(__dirname, "..");
const configPath = path.join(dataDir, "launcher.config.json");
const fallbackIndex = path.join(appRoot, "web", "index.html");
const logPath = path.join(logsDir, "launcher.log");
const launchSignalPath = path.join(logsDir, "launch.signal.json");
const appIconPath = path.join(__dirname, "assets", "project-p1lot.ico");
const expectedServerVersion = "1.0.0";

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function log(message) {
  ensureDir(logsDir);
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, line, "utf8");
  } catch (error) {
    // ignore logging errors
  }
}

function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch (error) {
    // ignore
  }
  return { port: 5544 };
}

function writeConfigPort(port) {
  try {
    ensureDir(path.dirname(configPath));
    const existing = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, "utf8"))
      : {};
    existing.port = port;
    fs.writeFileSync(configPath, JSON.stringify(existing, null, 2), "utf8");
  } catch (error) {
    log(`Failed to update port in config: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function checkHealth(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "localhost", port, path: "/api/health" }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve(
            Boolean(
              parsed &&
                parsed.ok &&
                parsed.app === "Project-P1L0T" &&
                parsed.version === expectedServerVersion
            )
          );
        } catch (_error) {
          resolve(false);
        }
      });
    });
    req.on("error", () => resolve(false));
  });
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "localhost", port, path: "/" }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
  });
}

function waitForServer(port, attempts = 20) {
  return new Promise((resolve) => {
    let count = 0;
    const check = () => {
      checkHealth(port).then((ok) => {
        if (ok) {
          resolve(true);
          return;
        }
        count += 1;
        if (count >= attempts) {
          resolve(false);
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

let serverProcess;
let autoMinimized = false;
let lastLaunchSignal = 0;
let gameWatchTimer;
let launchWatchTimer;

function readLaunchSignal() {
  try {
    if (!fs.existsSync(launchSignalPath)) {
      return null;
    }
    const raw = fs.readFileSync(launchSignalPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function isTitanfallRunning() {
  return new Promise((resolve) => {
    const child = spawn("tasklist", ["/FI", "IMAGENAME eq Titanfall2.exe"], {
      windowsHide: true,
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("close", () => {
      resolve(output.toLowerCase().includes("titanfall2.exe"));
    });
    child.on("error", () => resolve(false));
  });
}

function startGameWatcher(window) {
  if (gameWatchTimer) {
    clearInterval(gameWatchTimer);
  }
  gameWatchTimer = setInterval(async () => {
    if (!autoMinimized) {
      return;
    }
    const running = await isTitanfallRunning();
    if (!running) {
      autoMinimized = false;
      window.restore();
      window.show();
      window.focus();
      log("Game closed. Restored launcher window.");
    }
  }, 5000);
}

function startLaunchSignalWatcher(window) {
  if (launchWatchTimer) {
    clearInterval(launchWatchTimer);
  }
  const initial = readLaunchSignal();
  if (initial && typeof initial.timestamp === "number") {
    lastLaunchSignal = initial.timestamp;
  }
  launchWatchTimer = setInterval(() => {
    const signal = readLaunchSignal();
    if (!signal || typeof signal.timestamp !== "number") {
      return;
    }
    if (signal.timestamp > lastLaunchSignal) {
      lastLaunchSignal = signal.timestamp;
      autoMinimized = true;
      window.minimize();
      log("Launch signal received. Minimized launcher window.");
    }
  }, 1500);
}

async function createWindow() {
  try {
    nativeTheme.themeSource = "dark";
    const config = readConfig();

    const window = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 980,
      minHeight: 680,
      backgroundColor: "#0b0f14",
      autoHideMenuBar: true,
      icon: appIconPath,
      show: true,
    });

    try {
      await window.webContents.session.clearCache();
      await window.webContents.session.clearStorageData();
    } catch (error) {
      log(`Failed to clear cache: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
      log(`Renderer console [${level}]: ${message} (${sourceId}:${line})`);
    });

    window.webContents.on("render-process-gone", (_event, details) => {
      log(`Renderer process gone: ${details.reason} (${details.exitCode})`);
    });

    window.webContents.on("unresponsive", () => {
      log("Renderer became unresponsive.");
    });

    window.webContents.on("did-fail-load", (_event, code, desc) => {
      log(`Window failed to load: ${code} ${desc}`);
      const fallbackHtml = `
        <html>
          <body style="background:#0b0f14;color:#f3f4f6;font-family:Arial,sans-serif;padding:24px">
            <h2>Project-P1L0T Launcher</h2>
            <p>Failed to load the UI. See launcher.log for details.</p>
          </body>
        </html>
      `;
      window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
    });

    let port = config.port || 5544;
    const existing = await checkHealth(port);
    if (!existing) {
      let candidate = port;
      let tries = 0;
      while (tries < 10 && (await isPortOpen(candidate))) {
        candidate += 1;
        tries += 1;
      }
      port = candidate;
      if (port !== config.port) {
        writeConfigPort(port);
        log(`Updated config port to ${port}`);
      }
      const serverPath = path.join(appRoot, "server.js");
      serverProcess = spawn(process.execPath, [serverPath], {
        cwd: appRoot,
        detached: true,
        stdio: "ignore",
        env: {
          ...process.env,
          P1LOT_PORT: String(port),
          P1LOT_ROOT: installRoot,
          P1LOT_DATA_DIR: dataDir,
          ELECTRON_RUN_AS_NODE: "1",
        },
      });
      serverProcess.on("error", (error) => {
        log(`Server start failed: ${error.message}`);
      });
      serverProcess.unref();
    } else {
      log(`Reusing existing server on port ${port}`);
    }

    const ok = await waitForServer(port);
    log(`Server check ${ok ? "succeeded" : "failed"} on port ${port}`);
    if (ok) {
      await window.loadURL(`http://localhost:${port}`);
      window.webContents.on("did-finish-load", () => {
        setTimeout(async () => {
          try {
            const childCount = await window.webContents.executeJavaScript(
              "document.getElementById('root') ? document.getElementById('root').childElementCount : -1"
            );
            if (typeof childCount === "number" && childCount <= 0) {
              log("UI root is empty after load. Falling back to error page.");
              const fallbackHtml = `
                <html>
                  <body style="background:#0b0f14;color:#f3f4f6;font-family:Arial,sans-serif;padding:24px">
                    <h2>Project-P1L0T Launcher</h2>
                    <p>The UI did not render. Check desktop\\launcher.log for details.</p>
                  </body>
                </html>
              `;
              window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
            }
          } catch (error) {
            log(`UI root check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        }, 1500);
      });
      startLaunchSignalWatcher(window);
      startGameWatcher(window);
    } else if (fs.existsSync(fallbackIndex)) {
      await window.loadFile(fallbackIndex);
    } else {
      log("Fallback UI not found.");
    }
  } catch (error) {
    log(`Launcher crash: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});
