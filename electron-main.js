const { app, BrowserWindow } = require("electron");
const { createAppServer } = require("./lib/app-server");

const ELECTRON_PORT = Number(process.env.PORT || 18789);
let mainWindow = null;
let appServerInstance = null;

async function createWindow() {
  if (!appServerInstance) {
    const serverController = createAppServer({
      port: ELECTRON_PORT,
      host: "127.0.0.1",
      allowLocalEndpoints: true
    });
    try {
      appServerInstance = await serverController.start();
    } catch (error) {
      if (error && error.code !== "EADDRINUSE") {
        console.error("Failed to start embedded server:", error);
      }
    }
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 880,
    minHeight: 620,
    title: "AI 英语精读阅读器",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${ELECTRON_PORT}/`);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", createWindow);
app.on("window-all-closed", () => {
  if (appServerInstance && appServerInstance.server) {
    appServerInstance.server.close();
  }
  app.quit();
});
app.on("activate", () => {
  if (!mainWindow) createWindow();
});
