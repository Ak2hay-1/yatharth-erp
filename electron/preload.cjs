"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("yatharth", {
  pickBackupFolder: () => ipcRenderer.invoke("pick-backup-folder"),
});
