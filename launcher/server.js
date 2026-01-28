const http = require("http");
const https = require("https");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const installRoot = process.env.P1LOT_ROOT || "C:\\Project-P1L0T";
const dataDir = process.env.P1LOT_DATA_DIR || path.join(installRoot, "data");
const downloadsDir = path.join(dataDir, "downloads");
const rootDir = __dirname;
const webDir = path.join(rootDir, "web");
const upstreamRepo = "https://github.com/CydonianHeavyIndustries/Project-P1L0T.git";
const repoDir = path.join(dataDir, "repo");
let activeWebDir = webDir;
const configPath = path.join(dataDir, "launcher.config.json");
const logsDir = path.join(dataDir, "logs");
const serverLogPath = path.join(logsDir, "launcher-server.log");
const launchSignalPath = path.join(logsDir, "launch.signal.json");
let lastLaunchLogPath = null;
const serverVersion = "p1lot-launcher-2026-01-12b";
const githubRepo = "CydonianHeavyIndustries/Project-P1L0T";
const modpackAssetName = "Project-P1L0T-modpack.zip";
const modpackVersionFile = "modpack.version.json";
const cosmeticKeywords = [
  "skin",
  "camo",
  "model",
  "helmet",
  "reticle",
  "texture",
  "retexture",
  "shader",
  "sound",
  "soundpack",
  "sfx",
  "audio",
  "voice",
  "music",
  "blacklight",
];

const modpackState = {
  status: "idle",
  phase: "idle",
  progress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  speedBps: 0,
  message: "",
  error: null,
  updatedAt: null,
};

let modpackTask = null;

const defaultConfig = {
  port: 5544,
  dataPath: dataDir,
  profilePath: path.join(installRoot, "modpack"),
  steamPath: "C:\\Program Files (x86)\\Steam",
  tf2Path: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Titanfall2",
  gamePath: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Titanfall2\\Titanfall2.exe",
  launcherExe: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Titanfall2\\NorthstarLauncher.exe",
  configFilePath: path.join(
    installRoot,
    "modpack",
    "R2Northstar",
    "mods",
    "Project-P1L0T",
    "p1lot.config.json"
  ),
  launchParams: ["-novid", "-high", "-fullscreen", "+fps_max 144"]
};

const defaultConfigText = `{
  "profile": "Project-P1L0T",
  "notes": "Edit settings here."
}`;

function stripJsonComments(source) {
  if (!source || typeof source !== "string") {
    return "";
  }
  let result = "";
  let inString = false;
  let stringChar = "";
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        result += ch;
      }
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      result += ch;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }

    if (ch === "\"" || ch === "'") {
      inString = true;
      stringChar = ch;
      result += ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }
    result += ch;
  }

  return result;
}

function parseModJson(raw) {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const withoutComments = stripJsonComments(raw);
  try {
    return JSON.parse(withoutComments);
  } catch (_error) {
    try {
      const cleaned = withoutComments.replace(/,(\\s*[}\\]])/g, "$1");
      return JSON.parse(cleaned);
    } catch (_error2) {
      return null;
    }
  }
}

function normalizeBrokenModName(name) {
  if (!name) {
    return "";
  }
  return name.replace(/\s*\(.*\)\s*$/, "").trim();
}

function normalizeVersion(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/^v/i, "");
}

function compareVersions(leftValue, rightValue) {
  const left = normalizeVersion(leftValue).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = normalizeVersion(rightValue).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const l = left[i] || 0;
    const r = right[i] || 0;
    if (l > r) {
      return 1;
    }
    if (l < r) {
      return -1;
    }
  }
  return 0;
}

function isIgnoredModFolder(name) {
  if (!name) {
    return true;
  }
  const normalized = name.trim();
  if (!normalized) {
    return true;
  }
  const lower = normalized.toLowerCase();
  if (lower.startsWith("_") || lower.startsWith(".")) {
    return true;
  }
  if (lower.includes("stash")) {
    return true;
  }
  return false;
}

function isCosmeticText(text) {
  if (!text) {
    return false;
  }
  const haystack = text.toLowerCase();
  return cosmeticKeywords.some((keyword) => haystack.includes(keyword));
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function appendLog(level, message) {
  try {
    ensureDir(logsDir);
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    fs.appendFileSync(serverLogPath, line, "utf8");
  } catch (_error) {
    // ignore logging failures
  }
}

function appendLogRaw(data) {
  try {
    ensureDir(logsDir);
    fs.appendFileSync(serverLogPath, data);
  } catch (_error) {
    // ignore logging failures
  }
}

function writeLaunchSignal(payload = {}) {
  try {
    ensureDir(logsDir);
    const signal = { timestamp: Date.now(), progress: 100, state: "launched", ...payload };
    fs.writeFileSync(launchSignalPath, JSON.stringify(signal, null, 2), "utf8");
    // Drive UI state to completion so the launcher doesn't stall at 95%.
    updateModpackState({ status: "launched", phase: "launched", progress: 100, message: "Game launched" });
  } catch (_error) {
    // ignore signal errors
  }
}

function updateModpackState(partial) {
  Object.assign(modpackState, partial, { updatedAt: new Date().toISOString() });
}

function resetModpackState() {
  Object.assign(modpackState, {
    status: "idle",
    phase: "idle",
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    speedBps: 0,
    message: "",
    error: null,
    updatedAt: new Date().toISOString(),
  });
}

function getModpackRoot(config) {
  return (config && config.profilePath) || defaultConfig.profilePath;
}

function readModpackVersion(modpackRoot) {
  const versionPath = path.join(modpackRoot, modpackVersionFile);
  if (!fs.existsSync(versionPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(versionPath, "utf8"));
  } catch (_error) {
    return null;
  }
}

function getLocalModpackStatus(config) {
  const modpackRoot = getModpackRoot(config);
  const versionInfo = readModpackVersion(modpackRoot);
  const installed =
    fs.existsSync(path.join(modpackRoot, "R2Northstar")) ||
    fs.existsSync(path.join(modpackRoot, "NorthstarLauncher.exe"));
  return {
    installed,
    modpackRoot,
    versionInfo,
    version: versionInfo && versionInfo.version ? String(versionInfo.version) : null,
  };
}

function fetchJson(url, headers = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects"));
      return;
    }
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        "User-Agent": "Project-P1L0T-Launcher",
        Accept: "application/vnd.github+json",
        ...headers,
      },
    };
    const req = https.get(options, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve(fetchJson(res.headers.location, headers, redirectCount + 1));
        return;
      }
      if (res.statusCode !== 200) {
        const status = res.statusCode || 0;
        res.resume();
        reject(new Error(`Request failed with status ${status}`));
        return;
      }
      let body = "";
      res.on("data", (chunk) => {
        body += chunk.toString();
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
  });
}

async function fetchLatestRelease() {
  const url = `https://api.github.com/repos/${githubRepo}/releases/latest`;
  const data = await fetchJson(url);
  if (!data || !Array.isArray(data.assets)) {
    throw new Error("Latest release data missing");
  }
  const asset = data.assets.find((item) => item && item.name === modpackAssetName);
  if (!asset || !asset.browser_download_url) {
    throw new Error(`Release asset not found: ${modpackAssetName}`);
  }
  const tag = data.tag_name || data.name || "";
  const version = normalizeVersion(tag) || "0.0.0";
  return {
    version,
    tag: data.tag_name || "",
    name: data.name || "",
    publishedAt: data.published_at || null,
    assetUrl: asset.browser_download_url,
    assetSize: Number(asset.size) || 0,
  };
}

function downloadFile(url, destPath, onProgress, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects"));
      return;
    }
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        "User-Agent": "Project-P1L0T-Launcher",
        Accept: "application/octet-stream",
      },
    };
    const req = https.get(options, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve(downloadFile(res.headers.location, destPath, onProgress, redirectCount + 1));
        return;
      }
      if (res.statusCode !== 200) {
        const status = res.statusCode || 0;
        res.resume();
        reject(new Error(`Download failed with status ${status}`));
        return;
      }
      ensureDir(path.dirname(destPath));
      const totalBytes = Number(res.headers["content-length"]) || 0;
      let downloadedBytes = 0;
      let lastTick = Date.now();
      let lastBytes = 0;
      const out = fs.createWriteStream(destPath);

      res.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        const now = Date.now();
        if (onProgress && now - lastTick >= 400) {
          const deltaBytes = downloadedBytes - lastBytes;
          const elapsed = (now - lastTick) / 1000;
          const speedBps = elapsed > 0 ? deltaBytes / elapsed : 0;
          onProgress(downloadedBytes, totalBytes, speedBps);
          lastTick = now;
          lastBytes = downloadedBytes;
        }
      });

      res.on("end", () => {
        if (onProgress) {
          onProgress(downloadedBytes, totalBytes, 0);
        }
      });

      res.pipe(out);
      out.on("finish", () => out.close(() => resolve({ downloadedBytes, totalBytes })));
      out.on("error", (error) => {
        try {
          out.close();
        } catch (_error) {
          // ignore
        }
        reject(error);
      });
    });
    req.on("error", reject);
  });
}

async function captureModpackOverrides(modpackRoot) {
  const entries = [
    { relPath: path.join("R2Northstar", "enabledmods.json") },
    { relPath: path.join("R2Northstar", "enabledmods.old.json") },
    {
      relPath: path.join(
        "R2Northstar",
        "mods",
        "Project-P1L0T",
        "p1lot.config.json"
      ),
    },
  ];
  const captured = [];
  for (const entry of entries) {
    const fullPath = path.join(modpackRoot, entry.relPath);
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    const data = await fsp.readFile(fullPath);
    captured.push({ relPath: entry.relPath, data });
  }
  return captured;
}

async function restoreModpackOverrides(modpackRoot, captured) {
  for (const entry of captured) {
    const fullPath = path.join(modpackRoot, entry.relPath);
    await fsp.mkdir(path.dirname(fullPath), { recursive: true });
    await fsp.writeFile(fullPath, entry.data);
  }
}

async function resolveExtractRoot(tempDir) {
  const entries = await fsp.readdir(tempDir, { withFileTypes: true });
  if (entries.length === 1 && entries[0].isDirectory()) {
    return path.join(tempDir, entries[0].name);
  }
  return tempDir;
}

async function installModpackFromZip(config, zipPath) {
  const modpackRoot = getModpackRoot(config);
  const captured = await captureModpackOverrides(modpackRoot);
  const tempDir = await fsp.mkdtemp(path.join(downloadsDir, "modpack-"));
  const srcPath = escapePowerShellPath(zipPath);
  const destPath = escapePowerShellPath(tempDir);
  await runPowerShell(`Expand-Archive -LiteralPath '${srcPath}' -DestinationPath '${destPath}' -Force`);
  const sourceRoot = await resolveExtractRoot(tempDir);

  if (fs.existsSync(modpackRoot)) {
    await safeRemove(modpackRoot);
  }
  await fsp.mkdir(modpackRoot, { recursive: true });
  await fsp.cp(sourceRoot, modpackRoot, { recursive: true, force: true });

  if (captured.length > 0) {
    await restoreModpackOverrides(modpackRoot, captured);
  }

  await safeRemove(tempDir);
}

async function writeModpackVersion(modpackRoot, release) {
  const payload = {
    version: release.version,
    tag: release.tag,
    name: release.name,
    publishedAt: release.publishedAt,
    installedAt: new Date().toISOString(),
  };
  writeJson(path.join(modpackRoot, modpackVersionFile), payload);
}

async function buildModpackStatus(config, options = {}) {
  const local = getLocalModpackStatus(config);
  let latest = null;
  let latestError = null;
  if (options.fetchLatest) {
    try {
      latest = await fetchLatestRelease();
    } catch (error) {
      latestError = error instanceof Error ? error.message : "Unknown error";
    }
  }
  const latestVersion = latest ? latest.version : null;
  const updateAvailable =
    local.installed &&
    latestVersion &&
    (!local.version || compareVersions(local.version, latestVersion) < 0);
  return {
    installed: local.installed,
    modpackRoot: local.modpackRoot,
    currentVersion: local.version,
    latestVersion,
    updateAvailable: Boolean(updateAvailable),
    latestError,
    status: modpackState,
  };
}

async function runModpackInstall(config, options = {}) {
  resetModpackState();
  updateModpackState({ status: "running", phase: "checking", message: "Checking latest release" });

  const release = await fetchLatestRelease();
  const local = getLocalModpackStatus(config);
  const updateAvailable =
    local.installed &&
    release &&
    (!local.version || compareVersions(local.version, release.version) < 0);

  if (!options.force && local.installed && !updateAvailable) {
    updateModpackState({
      status: "complete",
      phase: "complete",
      progress: 100,
      message: "Modpack already up to date",
    });
    return { skipped: true, release };
  }

  ensureDir(downloadsDir);
  const zipPath = path.join(downloadsDir, `Project-P1L0T-modpack-${release.version}.zip`);
  updateModpackState({ phase: "download", message: "Downloading modpack" });

  const computeProgress = (downloaded, total) => {
    if (!total) {
      return 0;
    }
    return Math.max(0, Math.min(80, Math.round((downloaded / total) * 80)));
  };

  await downloadFile(release.assetUrl, zipPath, (downloaded, total, speedBps) => {
    updateModpackState({
      downloadedBytes: downloaded,
      totalBytes: total,
      speedBps,
      progress: computeProgress(downloaded, total),
    });
  });

  updateModpackState({
    phase: "extract",
    message: "Extracting modpack",
    progress: Math.max(modpackState.progress, 82),
  });

  const extractTimer = setInterval(() => {
    updateModpackState({ progress: Math.min(modpackState.progress + 2, 96) });
  }, 600);

  await installModpackFromZip(config, zipPath);

  clearInterval(extractTimer);
  updateModpackState({ phase: "finalizing", message: "Finalizing modpack", progress: 98 });
  await writeModpackVersion(getModpackRoot(config), release);

  updateModpackState({
    status: "complete",
    phase: "complete",
    progress: 100,
    message: "Modpack ready",
  });

  await safeRemove(zipPath);
  return { skipped: false, release };
}

async function startModpackInstall(config, options = {}) {
  if (modpackTask) {
    return { started: false, error: "Modpack update already running" };
  }
  if (await isProcessRunning("Titanfall2.exe")) {
    return { started: false, error: "Titanfall2.exe is running" };
  }
  if (await isProcessRunning("NorthstarLauncher.exe")) {
    return { started: false, error: "NorthstarLauncher.exe is running" };
  }

  modpackTask = runModpackInstall(config, options)
    .catch((error) => {
      updateModpackState({
        status: "error",
        phase: "error",
        message: "Modpack update failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    })
    .finally(() => {
      modpackTask = null;
    });

  return { started: true };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessRunning(processName) {
  return new Promise((resolve) => {
    const baseName = processName.replace(/\.exe$/i, "");
    const child = spawn("tasklist", ["/FI", `IMAGENAME eq ${processName}`], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("close", () => {
      if (output.toLowerCase().includes(processName.toLowerCase())) {
        resolve(true);
        return;
      }
      const ps = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `if (Get-Process -Name '${baseName}' -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }`,
        ],
        { windowsHide: true, stdio: "ignore" }
      );
      ps.on("exit", (code) => resolve(code === 0));
    });
    child.on("error", () => resolve(false));
  });
}

async function waitForProcess(processName, attempts = 8, delayMs = 1000) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await isProcessRunning(processName)) {
      return true;
    }
    await sleep(delayMs);
  }
  return false;
}

function killProcess(processName) {
  return new Promise((resolve) => {
    const child = spawn("taskkill", ["/F", "/IM", processName], {
      windowsHide: true,
      stdio: "ignore",
    });
    child.on("exit", () => resolve(true));
    child.on("error", () => resolve(false));
  });
}

async function waitForProcessExit(processName, attempts = 8, delayMs = 500) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (!(await isProcessRunning(processName))) {
      return true;
    }
    await sleep(delayMs);
  }
  return false;
}

async function waitForProcessOrExit(processName, maxMs, delayMs, exitCodeRef) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await isProcessRunning(processName)) {
      return { started: true };
    }
    if (exitCodeRef.value !== null) {
      return { started: false, exited: true, exitCode: exitCodeRef.value };
    }
    await sleep(delayMs);
  }
  return { started: false, exited: exitCodeRef.value !== null, exitCode: exitCodeRef.value };
}

function normalizeConfig(input) {
  const merged = { ...defaultConfig, ...(input || {}) };
  if (!merged.tf2Path && merged.gamePath) {
    merged.tf2Path = path.dirname(merged.gamePath);
  }
  if (merged.tf2Path) {
    if (!merged.gamePath || !merged.gamePath.toLowerCase().includes("titanfall2.exe")) {
      merged.gamePath = path.join(merged.tf2Path, "Titanfall2.exe");
    }
    const tf2Launcher = path.join(merged.tf2Path, "NorthstarLauncher.exe");
    if (fs.existsSync(tf2Launcher)) {
      merged.launcherExe = tf2Launcher;
    } else if (!merged.launcherExe) {
      merged.launcherExe = tf2Launcher;
    }
  }
  if (!merged.configFilePath && merged.profilePath) {
    merged.configFilePath = path.join(
      merged.profilePath,
      "R2Northstar",
      "mods",
      "Project-P1L0T",
      "p1lot.config.json"
    );
  }
  return merged;
}

function loadConfig() {
  const existing = readJson(configPath, null);
  if (!existing) {
    writeJson(configPath, normalizeConfig(defaultConfig));
    return normalizeConfig(defaultConfig);
  }
  return normalizeConfig(existing);
}

function saveConfig(config) {
  writeJson(configPath, normalizeConfig(config));
}

function getPaths(config) {
  const profilePath = config.profilePath;
  const directModsPath = path.join(profilePath, "mods");
  const directEnabledModsPath = path.join(profilePath, "enabledmods.json");
  const r2NorthstarPath = fs.existsSync(directModsPath) && fs.existsSync(directEnabledModsPath)
    ? profilePath
    : path.join(profilePath, "R2Northstar");
  const modsPath = path.join(r2NorthstarPath, "mods");
  const enabledModsPath = path.join(r2NorthstarPath, "enabledmods.json");
  const profileLauncher = path.join(profilePath, "NorthstarLauncher.exe");
  const launcherPath = fs.existsSync(config.launcherExe)
    ? config.launcherExe
    : fs.existsSync(profileLauncher)
      ? profileLauncher
      : config.launcherExe || profileLauncher;
  const gameDir = path.dirname(config.gamePath);
  return {
    profilePath,
    r2NorthstarPath,
    modsPath,
    enabledModsPath,
    launcherPath,
    gameDir,
    logsDir: path.join(r2NorthstarPath, "logs"),
  };
}

async function ensureProfileBin(config) {
  const profileBin = path.join(config.profilePath, "bin", "x64_retail");
  const gameBin = path.join(path.dirname(config.gamePath), "bin", "x64_retail");
  const tier0Profile = path.join(profileBin, "tier0.dll");
  if (fs.existsSync(tier0Profile)) {
    return { repaired: false };
  }
  if (!fs.existsSync(gameBin)) {
    return { repaired: false, error: `Game bin folder missing: ${gameBin}` };
  }
  await fsp.mkdir(profileBin, { recursive: true });
  await fsp.cp(gameBin, profileBin, { recursive: true, force: true });
  appendLog("info", `Repaired profile bin from ${gameBin}`);
  return { repaired: true };
}

function ensureEnabledModsFile(paths) {
  if (fs.existsSync(paths.enabledModsPath)) {
    return;
  }
  const oldPath = path.join(paths.r2NorthstarPath, "enabledmods.old.json");
  if (fs.existsSync(oldPath)) {
    fs.copyFileSync(oldPath, paths.enabledModsPath);
    return;
  }
  writeJson(paths.enabledModsPath, { Version: 1 });
}

async function listMods(config) {
  const paths = getPaths(config);
  ensureEnabledModsFile(paths);
  const enabledData = readJson(paths.enabledModsPath, { Version: 1 });
  const mods = [];
  let enabledDirty = false;
  const modNameSet = new Set();
  const modFolderSet = new Set();

  if (!fs.existsSync(paths.modsPath)) {
    return mods;
  }

  const entries = await fsp.readdir(paths.modsPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (isIgnoredModFolder(entry.name)) {
      continue;
    }

    const folderPath = path.join(paths.modsPath, entry.name);
    const modJsonPath = path.join(folderPath, "mod.json");
    if (!fs.existsSync(modJsonPath)) {
      continue;
    }

    try {
      const raw = await fsp.readFile(modJsonPath, "utf8");
      const modJson = parseModJson(raw);
      if (!modJson) {
        continue;
      }
      const modName = modJson.Name || entry.name;
      const modVersion = modJson.Version || "0.0.0";
      const description = modJson.Description || "";
      let author = modJson.Author || "";
      if (!author && Array.isArray(modJson.Authors)) {
        author = modJson.Authors.join(", ");
      }
      if (!author) {
        author = entry.name;
      }
      let enabledMap = enabledData[modName];
      if (!enabledMap && enabledData[entry.name]) {
        enabledMap = enabledData[entry.name];
        enabledData[modName] = enabledMap;
        delete enabledData[entry.name];
        enabledDirty = true;
      }
      if (!enabledMap) {
        enabledData[modName] = {};
        enabledMap = enabledData[modName];
        enabledDirty = true;
      }
      const anyEnabled = Object.values(enabledMap).some(Boolean);
      const explicit = enabledMap[modVersion];
      const enabled = typeof explicit === "boolean" ? explicit : anyEnabled;
      if (explicit === undefined && anyEnabled) {
        enabledData[modName][modVersion] = true;
        enabledDirty = true;
      }
      mods.push({
        id: modName,
        name: modName,
        version: modVersion,
        author,
        enabled,
        description,
        folder: entry.name,
      });
      modNameSet.add(modName);
      modFolderSet.add(entry.name);
    } catch (error) {
      continue;
    }
  }

  mods.sort((a, b) => a.name.localeCompare(b.name));

  if (enabledDirty) {
    writeJson(paths.enabledModsPath, enabledData);
  }
  return mods;
}

async function setModEnabled(config, modName, modVersion, enabled) {
  const paths = getPaths(config);
  ensureEnabledModsFile(paths);
  const enabledData = readJson(paths.enabledModsPath, { Version: 1 });
  if (!enabledData[modName]) {
    enabledData[modName] = {};
  }
  for (const version of Object.keys(enabledData[modName])) {
    enabledData[modName][version] = false;
  }
  const safeVersion = modVersion || "0.0.0";
  enabledData[modName][safeVersion] = enabled;
  writeJson(paths.enabledModsPath, enabledData);
}

async function setAllModsEnabled(config, enabled) {
  const mods = await listMods(config);
  const paths = getPaths(config);
  ensureEnabledModsFile(paths);
  const enabledData = readJson(paths.enabledModsPath, { Version: 1 });
  for (const mod of mods) {
    if (!enabledData[mod.name]) {
      enabledData[mod.name] = {};
    }
    for (const version of Object.keys(enabledData[mod.name])) {
      enabledData[mod.name][version] = false;
    }
    enabledData[mod.name][mod.version] = enabled;
  }
  writeJson(paths.enabledModsPath, enabledData);
}

async function deleteMod(config, modName) {
  const mods = await listMods(config);
  const mod = mods.find((item) => item.name === modName);
  if (!mod) {
    return false;
  }
  const paths = getPaths(config);
  ensureEnabledModsFile(paths);
  const target = path.join(paths.modsPath, mod.folder);
  await fsp.rm(target, { recursive: true, force: true });
  const enabledData = readJson(paths.enabledModsPath, { Version: 1 });
  delete enabledData[modName];
  writeJson(paths.enabledModsPath, enabledData);
  return true;
}

async function ensureConfigText(config) {
  const configFilePath = config.configFilePath;
  if (!configFilePath) {
    return "";
  }
  if (!fs.existsSync(configFilePath)) {
    await fsp.mkdir(path.dirname(configFilePath), { recursive: true });
    await fsp.writeFile(configFilePath, defaultConfigText, "utf8");
  }
  return fsp.readFile(configFilePath, "utf8");
}

async function updateConfigText(config, text) {
  const configFilePath = config.configFilePath;
  if (!configFilePath) {
    return;
  }
  await fsp.mkdir(path.dirname(configFilePath), { recursive: true });
  await fsp.writeFile(configFilePath, text, "utf8");
}

async function importMod(config, sourcePath) {
  const paths = getPaths(config);
  ensureDir(paths.modsPath);
  const resolvedSource = path.resolve(sourcePath);
  if (!fs.existsSync(resolvedSource)) {
    throw new Error("Mod path not found");
  }

  const stats = await fsp.stat(resolvedSource);
  if (stats.isDirectory()) {
    const target = path.join(paths.modsPath, path.basename(resolvedSource));
    await fsp.cp(resolvedSource, target, { recursive: true });
    return;
  }

  if (!resolvedSource.toLowerCase().endsWith(".zip")) {
    throw new Error("Only folders or .zip files are supported");
  }

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "p1lot-import-"));
  await runPowerShell(`Expand-Archive -LiteralPath '${resolvedSource}' -DestinationPath '${tempDir}' -Force`);

  const modsDir = path.join(tempDir, "mods");
  if (fs.existsSync(modsDir)) {
    const entries = await fsp.readdir(modsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const src = path.join(modsDir, entry.name);
      const dest = path.join(paths.modsPath, entry.name);
      await fsp.cp(src, dest, { recursive: true });
    }
  } else {
    const target = path.join(paths.modsPath, path.basename(resolvedSource, ".zip"));
    await fsp.cp(tempDir, target, { recursive: true });
  }

  await safeRemove(tempDir);
}

function looksCosmetic(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  if (text.includes("_os") || text.includes("os_")) {
    return true;
  }
  return cosmeticKeywords.some((keyword) => text.includes(keyword));
}

async function findModJsonInDir(rootPath) {
  const direct = path.join(rootPath, "mod.json");
  if (fs.existsSync(direct)) {
    try {
      const raw = await fsp.readFile(direct, "utf8");
      return parseModJson(raw);
    } catch (error) {
      return null;
    }
  }

  const modsDir = path.join(rootPath, "mods");
  if (!fs.existsSync(modsDir)) {
    return null;
  }

  const entries = await fsp.readdir(modsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const modJsonPath = path.join(modsDir, entry.name, "mod.json");
    if (!fs.existsSync(modJsonPath)) {
      continue;
    }
    try {
      const raw = await fsp.readFile(modJsonPath, "utf8");
      return parseModJson(raw);
    } catch (error) {
      return null;
    }
  }

  return null;
}

async function copyExtractedMods(tempDir, modsPath, fallbackName) {
  const modsDir = path.join(tempDir, "mods");
  if (fs.existsSync(modsDir)) {
    const entries = await fsp.readdir(modsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const src = path.join(modsDir, entry.name);
      const dest = path.join(modsPath, entry.name);
      await fsp.cp(src, dest, { recursive: true, force: true });
    }
    return;
  }

  const dest = path.join(modsPath, fallbackName);
  await fsp.cp(tempDir, dest, { recursive: true, force: true });
}

async function importModsBulk(config, sourcePath, options = {}) {
  const paths = getPaths(config);
  ensureDir(paths.modsPath);
  const resolvedSource = path.resolve(sourcePath);
  if (!fs.existsSync(resolvedSource)) {
    throw new Error("Mod path not found");
  }

  const includeCosmetics = Boolean(options.includeCosmetics);
  const summary = { imported: [], skipped: [], errors: [] };

  const processZip = async (zipPath) => {
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "p1lot-bulk-"));
    try {
      await runPowerShell(`Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${tempDir}' -Force`);
      const modJson = await findModJsonInDir(tempDir);
      const name = (modJson && modJson.Name) || path.basename(zipPath, ".zip");
      const description = (modJson && modJson.Description) || "";
      if (!includeCosmetics && looksCosmetic(name, description)) {
        summary.skipped.push({ name, reason: "cosmetic" });
        return;
      }
      await copyExtractedMods(tempDir, paths.modsPath, path.basename(zipPath, ".zip"));
      summary.imported.push({ name });
    } catch (error) {
      summary.errors.push({ path: zipPath, error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      await safeRemove(tempDir);
    }
  };

  const processDir = async (dirPath) => {
    try {
      const modJson = await findModJsonInDir(dirPath);
      const name = (modJson && modJson.Name) || path.basename(dirPath);
      const description = (modJson && modJson.Description) || "";
      if (!includeCosmetics && looksCosmetic(name, description)) {
        summary.skipped.push({ name, reason: "cosmetic" });
        return;
      }
      const dest = path.join(paths.modsPath, path.basename(dirPath));
      await fsp.cp(dirPath, dest, { recursive: true, force: true });
      summary.imported.push({ name });
    } catch (error) {
      summary.errors.push({ path: dirPath, error: error instanceof Error ? error.message : "Unknown error" });
    }
  };

  const stats = await fsp.stat(resolvedSource);
  if (!stats.isDirectory()) {
    if (resolvedSource.toLowerCase().endsWith(".zip")) {
      await processZip(resolvedSource);
    } else {
      await processDir(resolvedSource);
    }
    return summary;
  }

  const entries = await fsp.readdir(resolvedSource, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(resolvedSource, entry.name);
    if (entry.isDirectory()) {
      await processDir(entryPath);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".zip")) {
      await processZip(entryPath);
    }
  }

  return summary;
}

async function safeRemove(targetPath) {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await fsp.rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!error || (error.code !== "EBUSY" && error.code !== "EPERM")) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
      stdio: "ignore",
    });
    ps.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`PowerShell failed with code ${code}`));
      }
    });
  });
}

function escapePowerShellPath(value) {
  return value.replace(/'/g, "''");
}

async function exportProfile(config) {
  const paths = getPaths(config);
  const exportDir = config.dataPath && fs.existsSync(config.dataPath) ? config.dataPath : rootDir;
  ensureDir(exportDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const zipPath = path.join(exportDir, `Project-P1L0T-profile-${stamp}.zip`);
  const src = escapePowerShellPath(path.join(paths.profilePath, "*"));
  const dest = escapePowerShellPath(zipPath);
  await runPowerShell(`Compress-Archive -Path '${src}' -DestinationPath '${dest}' -Force`);
  return zipPath;
}

async function resetProfile(config) {
  await setAllModsEnabled(config, false);
  await clearCompiledCache(config);
}

async function tailFile(filePath, maxLines = 200) {
  if (!filePath || !fs.existsSync(filePath)) {
    return "";
  }
  const content = await fsp.readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  return lines.slice(-maxLines).join("\n");
}

async function verifyFiles(config) {
  const issues = [];
  const paths = getPaths(config);

  await sleep(20000);
  ensureEnabledModsFile(paths);

  if (!config.dataPath || !fs.existsSync(config.dataPath)) {
    issues.push(`Data folder missing: ${config.dataPath || "not set"}`);
  }
  if (!config.steamPath || !fs.existsSync(config.steamPath)) {
    issues.push(`Steam folder missing: ${config.steamPath || "not set"}`);
  }
  if (!config.tf2Path || !fs.existsSync(config.tf2Path)) {
    issues.push(`Titanfall 2 folder missing: ${config.tf2Path || "not set"}`);
  }
  if (!fs.existsSync(paths.profilePath)) {
    issues.push(`Profile path missing: ${paths.profilePath}`);
  }
  if (!fs.existsSync(paths.r2NorthstarPath)) {
    issues.push(`R2Northstar folder missing: ${paths.r2NorthstarPath}`);
  }
  if (!fs.existsSync(paths.modsPath)) {
    issues.push(`Mods folder missing: ${paths.modsPath}`);
  }
  if (!fs.existsSync(paths.launcherPath)) {
    issues.push(`NorthstarLauncher.exe missing: ${paths.launcherPath}`);
  }
  if (!fs.existsSync(config.gamePath)) {
    issues.push(`Titanfall2.exe missing: ${config.gamePath}`);
  }
  const tier0Path = path.join(paths.gameDir, "bin", "x64_retail", "tier0.dll");
  if (!fs.existsSync(tier0Path)) {
    issues.push(`tier0.dll missing: ${tier0Path}`);
  }
  const profileTier0 = path.join(paths.profilePath, "bin", "x64_retail", "tier0.dll");
  if (!fs.existsSync(profileTier0)) {
    issues.push(`Profile tier0.dll missing: ${profileTier0}`);
  }

  const mods = await listMods(config);
  const modNameSet = new Set(mods.map((mod) => mod.name));
  const modFolderSet = new Set(mods.map((mod) => mod.folder));
  const modNames = new Map();
  for (const mod of mods) {
    const count = modNames.get(mod.name) || 0;
    modNames.set(mod.name, count + 1);
  }
  for (const [name, count] of modNames.entries()) {
    if (count > 1) {
      issues.push(`Duplicate mod name detected: ${name}`);
    }
  }

  // Skip raw folder scans here; listMods already filters valid mod.json entries and
  // ignoring non-mod folders avoids false positives (stash, temp, manual copies).

  for (const mod of mods) {
    const modFolder = path.join(paths.modsPath, mod.folder);
    const modJsonPath = path.join(modFolder, "mod.json");
    const cosmetic = isCosmeticText(`${mod.name} ${mod.description} ${mod.folder}`);
    if (!fs.existsSync(modJsonPath)) {
      issues.push(`Missing mod.json: ${mod.name}`);
      continue;
    }
    try {
      const raw = await fsp.readFile(modJsonPath, "utf8");
      const modJson = parseModJson(raw);
      if (!modJson) {
        issues.push(`Invalid mod.json for ${mod.name}`);
        continue;
      }
      if (!cosmetic && modJson && modJson.Scripts && Array.isArray(modJson.Scripts)) {
        if (modJson.Scripts.length > 0) {
          const vscriptsDir = path.join(modFolder, "mod", "scripts", "vscripts");
          if (!fs.existsSync(vscriptsDir)) {
            issues.push(`Missing vscripts folder for ${mod.name}`);
          }
        }
      }
      if (!cosmetic && Array.isArray(modJson.Scripts)) {
        for (const script of modJson.Scripts) {
          if (!script.Path) {
            continue;
          }
          const scriptPath = path.join(modFolder, "mod", "scripts", "vscripts", script.Path);
          if (!fs.existsSync(scriptPath)) {
            issues.push(`Missing script for ${mod.name}: ${script.Path}`);
          }
        }
      }
      if (Array.isArray(modJson.Dependencies)) {
        for (const dep of modJson.Dependencies) {
          const depName = typeof dep === "string" ? dep : dep.Name;
          if (!depName) {
            continue;
          }
          const exists = mods.some((item) => item.name === depName);
          if (!exists) {
            issues.push(`Missing dependency for ${mod.name}: ${depName}`);
          }
        }
      }
    } catch (error) {
      issues.push(`Invalid mod.json for ${mod.name}`);
    }
  }

  return { ok: issues.length === 0, issues };
}

async function clearCompiledCache(config) {
  const paths = getPaths(config);
  const compiledPath = path.join(paths.r2NorthstarPath, "runtime", "compiled");
  if (fs.existsSync(compiledPath)) {
    await fsp.rm(compiledPath, { recursive: true, force: true });
  }
}

async function runCompileTest(config) {
  const result = await verifyFiles(config);
  const issues = Array.isArray(result.issues) ? result.issues : [];
  const summary = issues.slice(0, 20).join(" | ");
  const tail = await tailFile(serverLogPath, 200);
  return {
    ok: result.ok,
    logPath: serverLogPath,
    summary,
    tail,
    quarantined: [],
  };
}

async function getLatestNorthstarLogInfo(config) {
  const paths = getPaths(config);
  if (!fs.existsSync(paths.logsDir)) {
    return null;
  }
  const files = await fsp.readdir(paths.logsDir);
  if (files.length === 0) {
    return null;
  }
  let newest = null;
  let newestTime = 0;
  for (const file of files) {
    const fullPath = path.join(paths.logsDir, file);
    const stat = await fsp.stat(fullPath);
    if (stat.mtimeMs > newestTime) {
      newestTime = stat.mtimeMs;
      newest = fullPath;
    }
  }
  if (!newest) {
    return null;
  }
  return { path: newest, mtimeMs: newestTime };
}

async function getLatestNorthstarLog(config) {
  const info = await getLatestNorthstarLogInfo(config);
  return info ? info.path : null;
}

async function scanNorthstarLogForBrokenMods(config) {
  const latest = await getLatestNorthstarLog(config);
  if (!latest) {
    return [];
  }
  try {
    const content = await fsp.readFile(latest, "utf8");
    const matches = content.match(/belongs to ([^\r\n]+)/g) || [];
    const mods = new Set();
    for (const line of matches) {
      const match = line.match(/belongs to (.+)$/);
      if (match && match[1]) {
        const raw = match[1].trim();
        const normalized = normalizeBrokenModName(raw);
        mods.add(raw);
        if (normalized && normalized !== raw) {
          mods.add(normalized);
        }
      }
    }
    return Array.from(mods);
  } catch (_error) {
    return [];
  }
}

function findModMatch(mods, modName) {
  const lowered = modName.toLowerCase();
  let mod = mods.find(
    (item) =>
      item.name.toLowerCase() === lowered || item.folder.toLowerCase() === lowered
  );
  if (!mod) {
    mod = mods.find(
      (item) =>
        item.name.toLowerCase().startsWith(lowered) ||
        lowered.startsWith(item.name.toLowerCase())
    );
  }
  if (!mod) {
    mod = mods.find(
      (item) =>
        item.folder.toLowerCase().startsWith(lowered) ||
        lowered.startsWith(item.folder.toLowerCase())
    );
  }
  return mod || null;
}

async function collectNorthstarCompileErrors(config, limit = 6) {
  const latest = await getLatestNorthstarLog(config);
  if (!latest) {
    return { logPath: null, errors: [] };
  }
  try {
    const content = await fsp.readFile(latest, "utf8");
    const lines = content.split(/\r?\n/);
    const collected = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line || !line.includes("COMPILE ERROR")) {
        continue;
      }
      collected.push(line.trim());
      if (lines[i + 1]) {
        collected.push(lines[i + 1].trim());
      }
      if (lines[i + 2] && lines[i + 2].includes("belongs to")) {
        collected.push(lines[i + 2].trim());
      }
    }
    const unique = Array.from(new Set(collected)).slice(-limit);
    return { logPath: latest, errors: unique };
  } catch (_error) {
    return { logPath: latest, errors: [] };
  }
}

async function quarantineBrokenMods(config) {
  const brokenMods = await scanNorthstarLogForBrokenMods(config);
  if (brokenMods.length === 0) {
    return [];
  }
  const ignore = new Set(["Project-P1L0T"]);
  const paths = getPaths(config);
  ensureEnabledModsFile(paths);
  const enabledData = readJson(paths.enabledModsPath, { Version: 1 });
  const mods = await listMods(config);
  const stashDir = path.join(paths.r2NorthstarPath, "_stash_incompatible");
  ensureDir(stashDir);
  const quarantined = [];

  for (const modName of brokenMods) {
    if (!modName || ignore.has(modName) || modName.startsWith("Northstar")) {
      continue;
    }
    const mod = findModMatch(mods, modName);
    if (!mod) {
      continue;
    }
    if (enabledData[mod.name]) {
      for (const version of Object.keys(enabledData[mod.name])) {
        enabledData[mod.name][version] = false;
      }
    }
    const src = path.join(paths.modsPath, mod.folder);
    const dest = path.join(stashDir, mod.folder);
    if (fs.existsSync(src)) {
      try {
        await fsp.rename(src, dest);
      } catch (_error) {
        await fsp.cp(src, dest, { recursive: true, force: true });
        await fsp.rm(src, { recursive: true, force: true });
      }
    }
    quarantined.push(mod.name);
  }

  if (quarantined.length > 0) {
    writeJson(paths.enabledModsPath, enabledData);
  }
  return quarantined;
}

async function buildTroubleshootingInfo(config) {
  const mods = await listMods(config);
  const latestLog = await getLatestNorthstarLog(config);
  return {
    version: "1.0.0",
    platform: process.platform,
    dataPath: config.dataPath,
    profilePath: config.profilePath,
    steamPath: config.steamPath,
    tf2Path: config.tf2Path,
    gamePath: config.gamePath,
    launcherExe: config.launcherExe,
    modsTotal: mods.length,
    modsEnabled: mods.filter((mod) => mod.enabled).length,
    latestLog,
    timestamp: new Date().toISOString(),
  };
}

async function getDependencyIssues(config) {
  const paths = getPaths(config);
  ensureEnabledModsFile(paths);
  const enabledData = readJson(paths.enabledModsPath, { Version: 1 });
  const mods = await listMods(config);
  const modNames = new Set(mods.map((mod) => mod.name));
  const modFolders = new Set(mods.map((mod) => mod.folder));
  const missing = [];
  for (const [name, versions] of Object.entries(enabledData)) {
    if (name === "Version") {
      continue;
    }
    if (!Object.values(versions || {}).some(Boolean)) {
      continue;
    }
    if (!modNames.has(name) && !modFolders.has(name)) {
      missing.push(name);
    }
  }
  return missing;
}

async function copyLatestLog(config) {
  const latest = await getLatestNorthstarLog(config);
  if (!latest) {
    return null;
  }
  const exportDir = config.dataPath && fs.existsSync(config.dataPath) ? config.dataPath : rootDir;
  ensureDir(exportDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(exportDir, `Project-P1L0T-nslog-${stamp}.txt`);
  await fsp.copyFile(latest, dest);
  return dest;
}

async function writeTroubleshootSnapshot(config) {
  const exportDir = config.dataPath && fs.existsSync(config.dataPath) ? config.dataPath : rootDir;
  ensureDir(exportDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(exportDir, `Project-P1L0T-troubleshoot-${stamp}.json`);
  const info = await buildTroubleshootingInfo(config);
  const verify = await verifyFiles(config);
  const payload = { info, verify };
  await fsp.writeFile(dest, JSON.stringify(payload, null, 2), "utf8");
  return dest;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain" });
  res.end(text);
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html": return "text/html";
    case ".js": return "text/javascript";
    case ".css": return "text/css";
    case ".json": return "application/json";
    case ".png": return "image/png";
    case ".svg": return "image/svg+xml";
    case ".ico": return "image/x-icon";
    case ".woff": return "font/woff";
    case ".woff2": return "font/woff2";
    case ".ttf": return "font/ttf";
    case ".map": return "application/octet-stream";
    default: return "application/octet-stream";
  }
}

function tryGitSync() {
  // Require git in PATH
  const git = "git";
  try {
    if (!fs.existsSync(repoDir)) {
      const r = spawnSync(git, ["clone", upstreamRepo, repoDir], { stdio: "pipe" });
      if (r.status !== 0) {
        appendLog("warn", `git clone failed (${r.status}): ${r.stderr?.toString().trim() || "unknown error"}`);
        return;
      }
      appendLog("info", `Cloned launcher repo to ${repoDir}`);
    } else {
      const rFetch = spawnSync(git, ["-C", repoDir, "fetch", "--all"], { stdio: "pipe" });
      if (rFetch.status !== 0) {
        appendLog("warn", `git fetch failed (${rFetch.status}): ${rFetch.stderr?.toString().trim() || "unknown error"}`);
        return;
      }
      const rReset = spawnSync(git, ["-C", repoDir, "reset", "--hard", "origin/main"], { stdio: "pipe" });
      if (rReset.status !== 0) {
        appendLog("warn", `git reset failed (${rReset.status}): ${rReset.stderr?.toString().trim() || "unknown error"}`);
        return;
      }
      appendLog("info", "Launcher repo updated from origin/main");
    }
    const candidate = path.join(repoDir, "launcher", "web");
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, "index.html"))) {
      activeWebDir = candidate;
      appendLog("info", `Serving web UI from synced repo: ${activeWebDir}`);
    }
  } catch (error) {
    appendLog("warn", `git sync error: ${error instanceof Error ? error.message : "unknown"}`);
  }
}

function serveStatic(req, res) {
  const parsed = new URL(req.url, "http://localhost");
  let filePath = path.join(activeWebDir, parsed.pathname);
  if (parsed.pathname === "/") {
    filePath = path.join(activeWebDir, "index.html");
  }

  if (!filePath.startsWith(activeWebDir)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(activeWebDir, "index.html");
  }

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(data);
  } catch (error) {
    sendText(res, 404, "Not found");
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

let config = loadConfig();
const envPort = Number(process.env.P1LOT_PORT);
if (Number.isFinite(envPort) && envPort > 0) {
  config.port = envPort;
}

// Sync launcher assets from GitHub before starting the server (best effort).
tryGitSync();

ensureDir(logsDir);
appendLog("info", "Launcher server starting");

process.on("uncaughtException", (error) => {
  appendLog("error", `Unhandled exception: ${error instanceof Error ? error.message : "Unknown error"}`);
});

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, "http://localhost");

  if (!parsed.pathname.startsWith("/api")) {
    serveStatic(req, res);
    return;
  }

  try {
    if (req.method === "GET" && parsed.pathname === "/api/mods") {
      appendLog("info", "List mods");
      const mods = await listMods(config);
      sendJson(res, 200, { mods });
      return;
    }

    if (req.method === "GET" && parsed.pathname === "/api/health") {
      sendJson(res, 200, { ok: true, app: "Project-P1L0T", version: serverVersion });
      return;
    }

    if (req.method === "GET" && parsed.pathname === "/api/modpack/status") {
      config = loadConfig();
      const refresh = parsed.searchParams.get("refresh") === "1";
      const status = await buildModpackStatus(config, { fetchLatest: refresh });
      sendJson(res, 200, status);
      return;
    }

    if (req.method === "GET" && parsed.pathname === "/api/modpack/progress") {
      sendJson(res, 200, { status: modpackState });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/modpack/install") {
      config = loadConfig();
      const result = await startModpackInstall(config, { force: false });
      if (!result.started) {
        sendJson(res, 409, { error: result.error || "Modpack update already running", status: modpackState });
        return;
      }
      sendJson(res, 202, { ok: true, status: modpackState });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/modpack/update") {
      config = loadConfig();
      const result = await startModpackInstall(config, { force: true });
      if (!result.started) {
        sendJson(res, 409, { error: result.error || "Modpack update already running", status: modpackState });
        return;
      }
      sendJson(res, 202, { ok: true, status: modpackState });
      return;
    }

    if (req.method === "GET" && parsed.pathname === "/api/config") {
      config = loadConfig();
      saveConfig(config);
      sendJson(res, 200, { config });
      return;
    }

    if (req.method === "PUT" && parsed.pathname === "/api/config") {
      const body = await readBody(req);
      const payload = body ? JSON.parse(body) : {};
      const next = normalizeConfig({ ...config, ...payload });
      saveConfig(next);
      config = next;
      appendLog("info", "Config updated");
      sendJson(res, 200, { config: next });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/open-folder") {
      const body = await readBody(req);
      const payload = body ? JSON.parse(body) : {};
      if (!payload.path) {
        sendJson(res, 400, { error: "Missing path" });
        return;
      }
      spawn("explorer.exe", [payload.path], { detached: true, stdio: "ignore" }).unref();
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/mods/disable-all") {
      appendLog("info", "Disable all mods");
      await setAllModsEnabled(config, false);
      const mods = await listMods(config);
      sendJson(res, 200, { mods });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/mods/enable-all") {
      appendLog("info", "Enable all mods");
      await setAllModsEnabled(config, true);
      const mods = await listMods(config);
      sendJson(res, 200, { mods });
      return;
    }

    if (req.method === "POST" && parsed.pathname.startsWith("/api/mods/") && parsed.pathname.endsWith("/toggle")) {
      const name = decodeURIComponent(parsed.pathname.replace("/api/mods/", "").replace("/toggle", ""));
      const mods = await listMods(config);
      const mod = mods.find((item) => item.name === name);
      if (!mod) {
        sendJson(res, 404, { error: "Mod not found" });
        return;
      }
      await setModEnabled(config, mod.name, mod.version, !mod.enabled);
      const updated = await listMods(config);
      sendJson(res, 200, { mods: updated });
      return;
    }

    if (req.method === "DELETE" && parsed.pathname.startsWith("/api/mods/")) {
      const name = decodeURIComponent(parsed.pathname.replace("/api/mods/", ""));
      appendLog("info", `Delete mod ${name}`);
      const deleted = await deleteMod(config, name);
      if (!deleted) {
        sendJson(res, 404, { error: "Mod not found" });
        return;
      }
      const updated = await listMods(config);
      sendJson(res, 200, { mods: updated });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/launch") {
      const body = await readBody(req).catch(() => "");
      const payload = body ? JSON.parse(body) : {};
      config = loadConfig();
      const paths = getPaths(config);
      await killProcess("Titanfall2.exe");
      await killProcess("NorthstarLauncher.exe");
      await waitForProcessExit("Titanfall2.exe", 6, 500);
      await waitForProcessExit("NorthstarLauncher.exe", 6, 500);
      if (await isProcessRunning("Titanfall2.exe")) {
        sendJson(res, 409, { error: "Titanfall2.exe is still running. Close it and try again." });
        return;
      }
      if (!fs.existsSync(paths.launcherPath)) {
        appendLog("error", `Launch failed: launcher missing at ${paths.launcherPath}`);
        sendJson(res, 400, { error: "NorthstarLauncher.exe not found" });
        return;
      }
      if (!fs.existsSync(config.gamePath)) {
        appendLog("error", `Launch failed: game missing at ${config.gamePath}`);
        sendJson(res, 400, { error: "Titanfall2.exe not found" });
        return;
      }
      const repairResult = await ensureProfileBin(config);
      if (repairResult.error) {
        appendLog("error", repairResult.error);
        sendJson(res, 500, { error: repairResult.error });
        return;
      }
      const args = ["-northstar", `-profile=${paths.profilePath}`].concat(config.launchParams || []);
      const launchStart = Date.now();
      const preLaunchLog = await getLatestNorthstarLogInfo(config);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      lastLaunchLogPath = path.join(logsDir, `launch-${stamp}.log`);
      const logStream = fs.createWriteStream(lastLaunchLogPath, { flags: "a" });
      const serverLogStream = fs.createWriteStream(serverLogPath, { flags: "a" });
      let launcherExitCode = null;
      const exitRef = { value: null };
      const child = spawn(paths.launcherPath, args, {
        cwd: paths.gameDir,
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.on("data", (chunk) => {
        logStream.write(chunk);
        serverLogStream.write(chunk);
      });
      child.stderr.on("data", (chunk) => {
        logStream.write(chunk);
        serverLogStream.write(chunk);
      });
      child.on("error", (error) => {
        appendLog("error", `Launch spawn failed: ${error.message}`);
        logStream.write(`Launch spawn failed: ${error.message}\n`);
        serverLogStream.write(`Launch spawn failed: ${error.message}\n`);
        logStream.end();
        serverLogStream.end();
      });
      child.on("exit", (code) => {
        launcherExitCode = typeof code === "number" ? code : null;
        exitRef.value = launcherExitCode;
        appendLog("warn", `NorthstarLauncher exited with code ${code ?? "unknown"}. Log: ${lastLaunchLogPath}`);
        logStream.end();
        serverLogStream.end();
      });
      appendLog("info", `Launch requested. Log: ${lastLaunchLogPath}`);
      if (!payload.deferSignal) {
        writeLaunchSignal({ action: "launch" });
      }
      const waitResult = await waitForProcessOrExit("Titanfall2.exe", 180000, 1000, exitRef);
      if (!waitResult.started) {
        const exitNote =
          launcherExitCode === null
            ? "NorthstarLauncher did not report an exit code."
            : `NorthstarLauncher exit code: ${launcherExitCode}.`;
        const compileInfo = await collectNorthstarCompileErrors(config, 9);
        const brokenMods = await scanNorthstarLogForBrokenMods(config);
        const latestInfo = await getLatestNorthstarLogInfo(config);
        const logAdvanced =
          latestInfo &&
          (!preLaunchLog || latestInfo.mtimeMs > preLaunchLog.mtimeMs) &&
          latestInfo.mtimeMs >= launchStart - 2000;
        const logNote = logAdvanced
          ? "Northstar log updated after launch; process detection may have missed Titanfall2.exe."
          : "Northstar log did not update after launch.";
        if (launcherExitCode === 0 || (logAdvanced && compileInfo.errors.length === 0)) {
          appendLog("warn", `Launch may have succeeded without detection. Log: ${lastLaunchLogPath}`);
          sendJson(res, 200, {
            ok: true,
            logPath: lastLaunchLogPath,
            deferred: Boolean(payload.deferSignal),
            note: exitNote,
            logNote,
            northstarLog: compileInfo.logPath,
            compileErrors: compileInfo.errors,
            brokenMods,
          });
          return;
        }
        appendLog("error", `Launch failed: Titanfall2.exe not detected. Log: ${lastLaunchLogPath}`);
        sendJson(res, 500, {
          error: "Titanfall2.exe did not start. Check launch log.",
          logPath: lastLaunchLogPath,
          exitCode: launcherExitCode,
          note: exitNote,
          logNote,
          northstarLog: compileInfo.logPath,
          compileErrors: compileInfo.errors,
          brokenMods,
        });
        return;
      }
      sendJson(res, 200, { ok: true, logPath: lastLaunchLogPath, deferred: Boolean(payload.deferSignal) });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/launch-signal") {
      writeLaunchSignal({ action: "launch" });
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/verify") {
      appendLog("info", "Verify files");
      config = loadConfig();
      const result = await verifyFiles(config);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/compile") {
      appendLog("info", "Compile test");
      config = loadConfig();
      await clearCompiledCache(config);
      const compileResult = await runCompileTest(config);
      sendJson(res, 200, compileResult);
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/maintenance/clear-cache") {
      appendLog("info", "Clear compiled cache");
      await clearCompiledCache(config);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/maintenance/copy-log") {
      appendLog("info", "Copy latest Northstar log");
      config = loadConfig();
      const copied = await copyLatestLog(config);
      if (!copied) {
        sendJson(res, 404, { error: "No log file found" });
        return;
      }
      sendJson(res, 200, { ok: true, path: copied });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/maintenance/copy-troubleshoot") {
      appendLog("info", "Copy troubleshooting snapshot");
      config = loadConfig();
      const copied = await writeTroubleshootSnapshot(config);
      sendJson(res, 200, { ok: true, path: copied });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/maintenance/dependency-check") {
      appendLog("info", "Dependency check");
      config = loadConfig();
      const missing = await getDependencyIssues(config);
      sendJson(res, 200, { ok: missing.length === 0, missing });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/export-profile") {
      appendLog("info", "Export profile");
      const zipPath = await exportProfile(config);
      sendJson(res, 200, { ok: true, path: zipPath });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/maintenance/reset-profile") {
      appendLog("warn", "Reset profile requested");
      await resetProfile(config);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && parsed.pathname === "/api/logs/server") {
      const tail = Number(parsed.searchParams.get("tail") || "200");
      const content = await tailFile(serverLogPath, Number.isFinite(tail) ? tail : 200);
      sendJson(res, 200, { log: content });
      return;
    }

    if (req.method === "GET" && parsed.pathname === "/api/logs/latest") {
      const latest = await getLatestNorthstarLog(config);
      const content = latest ? await tailFile(latest, 200) : "";
      sendJson(res, 200, { log: content, path: latest });
      return;
    }

    if (req.method === "GET" && parsed.pathname === "/api/troubleshoot") {
      const info = await buildTroubleshootingInfo(config);
      sendJson(res, 200, info);
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/compatibility") {
      const result = await verifyFiles(config);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/import") {
      const body = await readBody(req);
      const payload = body ? JSON.parse(body) : {};
      if (!payload.path) {
        sendJson(res, 400, { error: "Missing path" });
        return;
      }
      appendLog("info", `Import mod from ${payload.path}`);
      await importMod(config, payload.path);
      const mods = await listMods(config);
      sendJson(res, 200, { mods });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/import-bulk") {
      const body = await readBody(req);
      const payload = body ? JSON.parse(body) : {};
      if (!payload.path) {
        sendJson(res, 400, { error: "Missing path" });
        return;
      }
      appendLog("info", `Import bulk from ${payload.path}`);
      const result = await importModsBulk(config, payload.path, {
        includeCosmetics: Boolean(payload.includeCosmetics),
      });
      const mods = await listMods(config);
      sendJson(res, 200, { ...result, mods });
      return;
    }

    if (req.method === "GET" && parsed.pathname === "/api/config-text") {
      const text = await ensureConfigText(config);
      sendJson(res, 200, { text });
      return;
    }

    if (req.method === "PUT" && parsed.pathname === "/api/config-text") {
      const body = await readBody(req);
      const payload = body ? JSON.parse(body) : {};
      await updateConfigText(config, payload.text || "");
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && parsed.pathname === "/api/launch-params") {
      sendJson(res, 200, { params: config.launchParams || [] });
      return;
    }

    if (req.method === "PUT" && parsed.pathname === "/api/launch-params") {
      const body = await readBody(req);
      const payload = body ? JSON.parse(body) : {};
      config.launchParams = Array.isArray(payload.params) ? payload.params : [];
      saveConfig(config);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/api/quit") {
      sendJson(res, 200, { ok: true });
      setTimeout(() => process.exit(0), 100);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    appendLog("error", error instanceof Error ? error.message : "Unknown error");
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

server.listen(config.port, () => {
  appendLog("info", `Launcher listening on http://localhost:${config.port}`);
  console.log(`Project-P1L0T launcher listening on http://localhost:${config.port}`);
});
