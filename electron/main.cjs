"use strict";

const { app, BrowserWindow, dialog, shell, utilityProcess } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const APP_NAME = "Yatharth Foods ERP";
const DEV_PORT = 3000;
const PACKAGED_PORT = 3847;
const READY_TIMEOUT_MS = 90_000;
const POLL_MS = 500;

const isDev = process.argv.includes("--dev");
const isPackaged = app.isPackaged;
const appRoot = path.resolve(__dirname, "..");

function resolveIconPath() {
  if (isPackaged) {
    const packaged = path.join(process.resourcesPath, "logo.ico");
    if (fs.existsSync(packaged)) return packaged;
  }
  const local = path.join(appRoot, "media", "logo.ico");
  return fs.existsSync(local) ? local : undefined;
}

let mainWindow = null;
let serverProcess = null;
let serverUtility = null;
let startedServer = false;
let isQuitting = false;
let activePort = isPackaged ? PACKAGED_PORT : DEV_PORT;
let serverLogPath = null;

function appUrl(port = activePort) {
  return `http://127.0.0.1:${port}`;
}

function testReady(port = activePort) {
  return new Promise((resolve) => {
    const req = http.get(appUrl(port), { timeout: 2000 }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitUntilReady(port = activePort) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await testReady(port)) return true;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return false;
}

function ensureNodeOnPath() {
  const nodeDir = path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs");
  if (fs.existsSync(path.join(nodeDir, "node.exe"))) {
    const parts = (process.env.Path || process.env.PATH || "").split(path.delimiter);
    if (!parts.some((p) => p.toLowerCase() === nodeDir.toLowerCase())) {
      process.env.Path = `${nodeDir}${path.delimiter}${process.env.Path || process.env.PATH || ""}`;
    }
  }
}

function findNpmCmd() {
  ensureNodeOnPath();
  const candidates = [
    process.env.npm_execpath,
    path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "npm.cmd"),
    path.join(process.env["ProgramFiles(x86)"] || "", "nodejs", "npm.cmd"),
    path.join(process.env.APPDATA || "", "npm", "npm.cmd"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function appendServerLog(chunk) {
  if (!serverLogPath || chunk == null) return;
  try {
    fs.appendFileSync(serverLogPath, chunk.toString());
  } catch {
    // ignore
  }
}

function readServerLogTail(maxChars = 1200) {
  if (!serverLogPath || !fs.existsSync(serverLogPath)) return "";
  try {
    const text = fs.readFileSync(serverLogPath, "utf8");
    return text.slice(-maxChars).trim();
  } catch {
    return "";
  }
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

function stopServer() {
  if (!startedServer) return;

  if (serverUtility) {
    try {
      serverUtility.kill();
    } catch {
      // ignore
    }
    if (serverUtility.pid) killProcessTree(serverUtility.pid);
    serverUtility = null;
  }

  if (serverProcess) {
    killProcessTree(serverProcess.pid);
    serverProcess = null;
  }

  startedServer = false;
}

function toSqliteFileUrl(absolutePath) {
  return `file:${path.resolve(absolutePath).replace(/\\/g, "/")}`;
}

function ensureUserData() {
  const userData = app.getPath("userData");
  fs.mkdirSync(userData, { recursive: true });
  fs.mkdirSync(path.join(userData, "uploads", "documents"), { recursive: true });
  fs.mkdirSync(path.join(userData, "backups"), { recursive: true });

  serverLogPath = path.join(userData, "server.log");
  try {
    fs.writeFileSync(serverLogPath, `--- ${new Date().toISOString()} starting ---\n`);
  } catch {
    // ignore
  }

  const dbPath = path.join(userData, "yatharth.db");
  if (!fs.existsSync(dbPath)) {
    const template = path.join(process.resourcesPath, "template.db");
    if (!fs.existsSync(template)) {
      throw new Error(
        `Missing database template at ${template}. Reinstall the application.`,
      );
    }
    fs.copyFileSync(template, dbPath);
  }

  const secretPath = path.join(userData, "auth-secret.txt");
  let authSecret;
  if (fs.existsSync(secretPath)) {
    authSecret = fs.readFileSync(secretPath, "utf8").trim();
  } else {
    authSecret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(secretPath, authSecret, "utf8");
  }

  return {
    userData,
    dbPath,
    authSecret,
    databaseUrl: toSqliteFileUrl(dbPath),
  };
}

function findStandaloneServerJs() {
  const base = path.join(process.resourcesPath, "next-server");
  const direct = path.join(base, "server.js");
  if (fs.existsSync(direct)) return { cwd: base, serverJs: direct };

  if (!fs.existsSync(base)) {
    throw new Error(`Packaged app server folder missing: ${base}`);
  }

  const entries = fs.readdirSync(base, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const nested = path.join(base, entry.name, "server.js");
    if (fs.existsSync(nested)) {
      return { cwd: path.join(base, entry.name), serverJs: nested };
    }
  }

  throw new Error(`Could not find server.js under ${base}`);
}

function assertPackagedServerLayout(cwd) {
  const nextDir = path.join(cwd, "node_modules", "next");
  if (!fs.existsSync(nextDir)) {
    throw new Error(
      `Packaged server is incomplete (missing node_modules/next under ${cwd}). Re-run npm run dist:win and reinstall.`,
    );
  }
}

function onServerExit(code, signal) {
  serverProcess = null;
  serverUtility = null;
  if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
    const tail = readServerLogTail();
    dialog.showErrorBox(
      APP_NAME,
      `The local server stopped unexpectedly (code ${code ?? "n/a"}, signal ${signal ?? "n/a"}).` +
        (tail ? `\n\n${tail}` : ""),
    );
    app.quit();
  }
}

function startPackagedServer() {
  activePort = PACKAGED_PORT;
  const { userData, authSecret, databaseUrl } = ensureUserData();
  const { cwd, serverJs } = findStandaloneServerJs();
  assertPackagedServerLayout(cwd);

  const env = {
    ...process.env,
    PORT: String(PACKAGED_PORT),
    HOSTNAME: "127.0.0.1",
    AUTH_URL: appUrl(PACKAGED_PORT),
    AUTH_SECRET: authSecret,
    DATABASE_URL: databaseUrl,
    YATHARTH_DATA_DIR: userData,
    FORCE_COLOR: "0",
    NODE_ENV: "production",
  };
  // Ensure child does not inherit a stale Electron-as-node flag incorrectly
  delete env.ELECTRON_RUN_AS_NODE;

  appendServerLog(`cwd=${cwd}\nserver=${serverJs}\nport=${PACKAGED_PORT}\n`);

  // utilityProcess is a real Node child — more reliable than spawn(execPath)+ELECTRON_RUN_AS_NODE
  serverUtility = utilityProcess.fork(serverJs, [], {
    cwd,
    env,
    stdio: "pipe",
    serviceName: "yatharth-next",
  });

  if (serverUtility.stdout) {
    serverUtility.stdout.on("data", (d) => appendServerLog(d));
  }
  if (serverUtility.stderr) {
    serverUtility.stderr.on("data", (d) => appendServerLog(d));
  }
  serverUtility.on("exit", (code) => onServerExit(code, null));

  startedServer = true;
}

function startDevNpmServer() {
  activePort = DEV_PORT;
  const npmCmd = findNpmCmd();
  const script = isDev ? "dev" : "start";

  serverProcess = spawn(npmCmd, ["run", script], {
    cwd: appRoot,
    env: { ...process.env, FORCE_COLOR: "0" },
    stdio: "ignore",
    windowsHide: true,
    shell: process.platform === "win32",
  });

  startedServer = true;
  serverProcess.on("error", (err) => {
    console.error("Failed to start Next.js:", err);
  });
  serverProcess.on("exit", (code, signal) => onServerExit(code, signal));
}

function startNextServer() {
  if (isPackaged) {
    startPackagedServer();
  } else {
    startDevNpmServer();
  }
}

async function ensureServer() {
  if (!isPackaged && (await testReady(DEV_PORT))) {
    activePort = DEV_PORT;
    startedServer = false;
    return;
  }

  if (isPackaged && (await testReady(PACKAGED_PORT))) {
    activePort = PACKAGED_PORT;
    startedServer = false;
    return;
  }

  startNextServer();
  const ready = await waitUntilReady(activePort);
  if (!ready) {
    const tail = readServerLogTail();
    stopServer();
    throw new Error(
      `Timed out waiting for ${APP_NAME} at ${appUrl(activePort)}.` +
        (isPackaged
          ? ` Check %AppData%\\Yatharth Foods ERP\\server.log or reinstall.`
          : isDev
            ? " Try running `npm run dev` in a terminal to see errors."
            : " Run `npm run build` once, then try again.") +
        (tail ? `\n\n${tail}` : ""),
    );
  }
}

function createWindow() {
  const iconPath = resolveIconPath();
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
        return { action: "allow" };
      }
    } catch {
      // fall through
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow.loadURL(appUrl());
}

async function bootstrap() {
  try {
    await ensureServer();
    await createWindow();
  } catch (err) {
    dialog.showErrorBox(APP_NAME, err instanceof Error ? err.message : String(err));
    stopServer();
    app.quit();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(bootstrap);

  app.on("window-all-closed", () => {
    isQuitting = true;
    stopServer();
    app.quit();
  });

  app.on("before-quit", () => {
    isQuitting = true;
    stopServer();
  });
}
