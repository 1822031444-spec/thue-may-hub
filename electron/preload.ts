import { contextBridge, ipcRenderer } from 'electron';

/**
 * Bề mặt duy nhất mà giao diện được phép chạm vào tiến trình chính.
 * contextIsolation vẫn bật, nên trang web không truy cập được Node API nào khác.
 */
contextBridge.exposeInMainWorld('thueMay', {
  isDesktop: true,
  platform: process.platform,
  appVersion: process.env.THUEMAY_VERSION || '',

  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  dataDir: () => ipcRenderer.invoke('app:data-dir'),
  openDataDir: () => ipcRenderer.invoke('app:open-data-dir'),
  chooseDataDir: () => ipcRenderer.invoke('app:choose-data-dir'),
  resetDataDir: () => ipcRenderer.invoke('app:reset-data-dir'),
  chooseFolder: (title?: string) => ipcRenderer.invoke('app:choose-folder', title),

  onMaximizeChange: (handler: (maximized: boolean) => void) => {
    const listener = (_event: unknown, maximized: boolean) => handler(maximized);
    ipcRenderer.on('window:maximize-changed', listener);
    return () => ipcRenderer.off('window:maximize-changed', listener);
  },
});
