import { app, BrowserWindow, dialog, ipcMain, Menu, shell, utilityProcess, type UtilityProcess } from 'electron';
import { createServer } from 'node:net';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Tiến trình chính của bản desktop.
 *
 * Toàn bộ nghiệp vụ vẫn nằm ở server Express + SQLite như bản web; ở đây chỉ có
 * ba việc: khởi động server đó trong một tiến trình Node con, mở cửa sổ trỏ vào
 * nó, và cung cấp vài lệnh điều khiển cửa sổ cho giao diện.
 */

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;
let serverProcess: UtilityProcess | null = null;

/* ---- Ghi lỗi khởi động --------------------------------------------------- */

/**
 * App đóng gói không có cửa sổ console, nên lỗi lúc khởi động sẽ biến mất không
 * dấu vết. Ghi ra file để còn chỗ mà tra khi máy người dùng không mở được app.
 */
function logFailure(scope: string, error: unknown) {
  const detail = error instanceof Error ? (error.stack || error.message) : String(error);
  const line = `[${new Date().toISOString()}] ${scope}\n${detail}\n\n`;
  for (const dir of [safeUserData(), tmpdir()]) {
    if (!dir) continue;
    try {
      appendFileSync(join(dir, 'thuemay-startup-error.log'), line);
      return;
    } catch {
      /* Thử chỗ ghi tiếp theo. */
    }
  }
}

function safeUserData() {
  try {
    return app.getPath('userData');
  } catch {
    return '';
  }
}

process.on('uncaughtException', (error) => logFailure('uncaughtException', error));
process.on('unhandledRejection', (error) => logFailure('unhandledRejection', error));

/* ---- Đường dẫn tài nguyên ------------------------------------------------ */

/* ---- Nơi đặt dữ liệu ----------------------------------------------------- */

/** Ba file tạo nên một database SQLite ở chế độ WAL. Thiếu file nào cũng mất dữ liệu gần nhất. */
const DATABASE_FILES = ['thue-may.db', 'thue-may.db-wal', 'thue-may.db-shm'];

type DataLocation = { dir?: string; copyFrom?: string };

const locationFile = () => join(app.getPath('userData'), 'data-location.json');

function readDataLocation(): DataLocation {
  const file = locationFile();
  if (!existsSync(file)) return {};
  try {
    // Trình soạn thảo trên Windows hay thêm BOM; JSON.parse gặp BOM là ném lỗi.
    return JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, '')) as DataLocation;
  } catch (error) {
    // Hỏng file này nghĩa là app quay về thư mục mặc định, tức mở nhầm database.
    // Phải còn dấu vết để tra, đừng nuốt lỗi.
    logFailure('read-data-location', error);
    return {};
  }
}

function writeDataLocation(value: DataLocation) {
  writeFileSync(locationFile(), JSON.stringify(value, null, 2));
}

/**
 * Bản portable lưu dữ liệu ngay cạnh file chạy, nên chép cả thư mục sang máy
 * khác là mở ra đúng dữ liệu cũ — không phải nhớ đồng bộ tay.
 * electron-builder đặt sẵn biến PORTABLE_EXECUTABLE_DIR cho bản này.
 */
function portableDataDir() {
  const dir = process.env.PORTABLE_EXECUTABLE_DIR;
  return dir ? join(dir, 'thuemay-data') : null;
}

export function resolveDataDir() {
  const portable = portableDataDir();
  if (portable) return portable;
  // Khi phát triển, dùng chung database với `npm run dev` để không phải nhập lại dữ liệu.
  if (!app.isPackaged) return join(app.getAppPath(), 'data');
  return readDataLocation().dir || join(app.getPath('userData'), 'data');
}

/**
 * Chép dữ liệu sang thư mục mới chọn. Chạy lúc khởi động, trước khi server mở
 * database — chép một database WAL đang có kết nối mở dễ ra bản sao dở dang.
 */
function migratePendingData(target: string) {
  const location = readDataLocation();
  if (!location.copyFrom) return;
  try {
    const alreadyThere = existsSync(join(target, DATABASE_FILES[0]));
    const sourceExists = existsSync(join(location.copyFrom, DATABASE_FILES[0]));
    if (!alreadyThere && sourceExists) {
      mkdirSync(target, { recursive: true });
      for (const name of DATABASE_FILES) {
        const from = join(location.copyFrom, name);
        if (existsSync(from)) copyFileSync(from, join(target, name));
      }
    }
  } catch (error) {
    logFailure('migrate-data', error);
  }
  writeDataLocation({ dir: location.dir });
}

/**
 * Người dùng có thể trỏ dữ liệu vào USB hoặc ổ mạng rồi mở app lúc chưa cắm USB.
 * Lặng lẽ quay về thư mục mặc định là cách hỏng tệ nhất: app mở ra trắng trơn,
 * trông y như mất sạch dữ liệu, và mọi thứ nhập vào sau đó rơi nhầm database.
 * Hỏi thẳng và để họ tự chọn.
 */
function ensureDataDir(): string {
  for (;;) {
    const dir = resolveDataDir();
    try {
      mkdirSync(dir, { recursive: true });
      const probe = join(dir, '.thuemay-write-test');
      writeFileSync(probe, '');
      unlinkSync(probe);
      return dir;
    } catch (error) {
      logFailure('data-dir-unavailable', error);
      // Bản portable luôn lưu cạnh file chạy, không có thư mục mặc định để lui về.
      const canFallBack = !portableDataDir();
      const buttons = canFallBack ? ['Thử lại', 'Dùng thư mục mặc định', 'Thoát'] : ['Thử lại', 'Thoát'];
      const choice = dialog.showMessageBoxSync({
        type: 'warning',
        title: 'Không mở được thư mục dữ liệu',
        message: 'Không đọc ghi được thư mục chứa dữ liệu.',
        detail:
          `${dir}\n\n` +
          'Nếu dữ liệu nằm trên USB hay ổ mạng, hãy cắm hoặc kết nối lại rồi bấm Thử lại.' +
          (canFallBack ? '\n\nChọn thư mục mặc định sẽ mở một database trống khác, không phải dữ liệu cũ.' : ''),
        buttons,
        defaultId: 0,
        cancelId: buttons.length - 1,
      });

      if (choice === buttons.length - 1) {
        app.exit(0);
        return dir;
      }
      if (canFallBack && choice === 1) writeDataLocation({});
    }
  }
}

/** Bundle server và thư mục giao diện nằm ngoài asar để đọc ghi không bị bất ngờ. */
function resourcePaths() {
  if (app.isPackaged) {
    return {
      serverEntry: join(process.resourcesPath, 'server', 'server.cjs'),
      staticDir: join(process.resourcesPath, 'renderer'),
    };
  }
  const root = app.getAppPath();
  return {
    serverEntry: join(root, 'build', 'electron', 'server.cjs'),
    staticDir: join(root, 'dist'),
  };
}

/* ---- Ghi nhớ kích thước cửa sổ ------------------------------------------- */

type WindowState = { width: number; height: number; x?: number; y?: number; maximized?: boolean };

const stateFile = () => join(app.getPath('userData'), 'window-state.json');

function readWindowState(): WindowState {
  try {
    const parsed = JSON.parse(readFileSync(stateFile(), 'utf8')) as WindowState;
    if (parsed.width > 400 && parsed.height > 300) return parsed;
  } catch {
    /* Chưa có hoặc file hỏng thì dùng kích thước mặc định. */
  }
  return { width: 1380, height: 880 };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = mainWindow.isMaximized() ? mainWindow.getNormalBounds() : mainWindow.getBounds();
  try {
    writeFileSync(stateFile(), JSON.stringify({ ...bounds, maximized: mainWindow.isMaximized() }));
  } catch {
    /* Không ghi được thì lần sau mở bằng kích thước mặc định, không đáng để báo lỗi. */
  }
}

/* ---- Khởi động server ---------------------------------------------------- */

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => (port ? resolve(port) : reject(new Error('Không tìm được cổng trống.'))));
    });
  });
}

async function waitForServer(port: number, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {
      /* Server chưa lên, thử lại. */
    }
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  throw new Error('Server nội bộ không phản hồi sau 30 giây.');
}

async function startServer() {
  const { serverEntry, staticDir } = resourcePaths();
  const dataDir = ensureDataDir();
  migratePendingData(dataDir);
  const port = await findFreePort();

  serverProcess = utilityProcess.fork(serverEntry, [], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: String(port),
      // Chỉ nghe trên loopback: Windows không hỏi quyền tường lửa và dữ liệu
      // không lộ ra mạng nội bộ.
      HOST: '127.0.0.1',
      STATIC_DIR: staticDir,
      DATABASE_PATH: join(dataDir, 'thue-may.db'),
      // Cookie phiên chỉ được đánh dấu `secure` khi NODE_ENV là production. App này
      // phục vụ qua http://127.0.0.1 nên cờ đó sẽ chặn đăng nhập — giữ giá trị riêng.
      NODE_ENV: 'desktop',
    },
  });

  serverProcess.stdout?.on('data', (chunk) => process.stdout.write(`[api] ${chunk}`));
  serverProcess.stderr?.on('data', (chunk) => process.stderr.write(`[api] ${chunk}`));

  await waitForServer(port);
  return port;
}

function stopServer() {
  serverProcess?.kill();
  serverProcess = null;
}

/* ---- Cửa sổ -------------------------------------------------------------- */

function createWindow(url: string) {
  const state = readWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 960,
    minHeight: 640,
    // Thanh tiêu đề do giao diện tự vẽ nên bỏ khung mặc định của hệ điều hành.
    frame: false,
    show: false,
    autoHideMenuBar: true,
    title: 'Thuê Máy Hub',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  if (state.maximized) mainWindow.maximize();

  mainWindow.once('ready-to-show', () => {
    // Hiện cửa sổ sau khi trang đã vẽ xong để không chớp nền trắng ở chế độ tối.
    mainWindow?.show();
  });

  const notifyMaximize = () => mainWindow?.webContents.send('window:maximize-changed', mainWindow.isMaximized());
  mainWindow.on('maximize', notifyMaximize);
  mainWindow.on('unmaximize', notifyMaximize);
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => { mainWindow = null; });

  // Link ra ngoài mở bằng trình duyệt mặc định, không biến cửa sổ app thành browser.
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    void shell.openExternal(target);
    return { action: 'deny' };
  });

  /*
   * Cửa sổ app không có thanh tải file như trình duyệt. Không bắt sự kiện này
   * thì bấm "Xuất CSV" xong chẳng có gì xảy ra và người dùng không biết vì sao —
   * im lặng còn tệ hơn báo lỗi. Hỏi chỗ lưu rồi mở thư mục chứa file.
   */
  mainWindow.webContents.session.on('will-download', (_event, item) => {
    const target = dialog.showSaveDialogSync(mainWindow!, {
      title: 'Lưu file',
      defaultPath: join(app.getPath('downloads'), item.getFilename()),
      filters: [{ name: 'CSV (Excel đọc được)', extensions: ['csv'] }],
    });

    if (!target) {
      item.cancel();
      return;
    }

    item.setSavePath(target);
    item.once('done', (_doneEvent, state) => {
      if (state === 'completed') shell.showItemInFolder(target);
      else logFailure('download', `Tải file không xong: ${state}`);
    });
  });

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) mainWindow?.webContents.reload();
    if (input.key === 'F12') mainWindow?.webContents.toggleDevTools();
  });

  void mainWindow.loadURL(url);
}

/* ---- IPC ----------------------------------------------------------------- */

function registerIpc() {
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);

  ipcMain.handle('app:data-dir', () => ({
    dir: resolveDataDir(),
    portable: Boolean(portableDataDir()),
    custom: Boolean(readDataLocation().dir),
  }));

  ipcMain.handle('app:open-data-dir', async () => {
    const dir = resolveDataDir();
    mkdirSync(dir, { recursive: true });
    return shell.openPath(dir);
  });

  /**
   * Đổi thư mục dữ liệu. Thư mục đích đã có database thì dùng luôn — đây chính
   * là cách máy thứ hai mở dữ liệu trên USB. Chưa có thì chép dữ liệu hiện tại
   * sang, việc chép làm lúc khởi động lại để không đụng vào database đang mở.
   */
  ipcMain.handle('app:choose-data-dir', async () => {
    if (portableDataDir()) {
      return { ok: false, message: 'Bản portable luôn lưu dữ liệu cạnh file chạy, không đổi được.' };
    }

    const picked = await dialog.showOpenDialog({
      title: 'Chọn thư mục lưu dữ liệu',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Dùng thư mục này',
    });
    if (picked.canceled || !picked.filePaths.length) return { ok: false };

    const target = picked.filePaths[0];
    const current = resolveDataDir();
    if (target === current) return { ok: false, message: 'Đây đang là thư mục dữ liệu hiện tại.' };

    try {
      mkdirSync(target, { recursive: true });
      const probe = join(target, '.thuemay-write-test');
      writeFileSync(probe, 'ok');
      unlinkSync(probe);
    } catch {
      return { ok: false, message: 'Không ghi được vào thư mục này. Hãy chọn chỗ khác.' };
    }

    const hasDatabase = existsSync(join(target, DATABASE_FILES[0]));
    writeDataLocation({ dir: target, copyFrom: hasDatabase ? undefined : current });

    app.relaunch();
    app.exit(0);
    return { ok: true, moved: !hasDatabase };
  });

  /**
   * Mở hộp thoại chọn thư mục và chỉ trả về đường dẫn, không đụng gì tới dữ liệu.
   * Bên gọi tự quyết định làm gì với đường dẫn đó — hiện dùng cho thư mục sao lưu.
   */
  ipcMain.handle('app:choose-folder', async (_event, title?: string) => {
    const picked = await dialog.showOpenDialog({
      title: title || 'Chọn thư mục',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Dùng thư mục này',
    });
    return picked.canceled ? '' : (picked.filePaths[0] ?? '');
  });

  ipcMain.handle('app:reset-data-dir', () => {
    if (portableDataDir()) return { ok: false };
    writeDataLocation({});
    app.relaunch();
    app.exit(0);
    return { ok: true };
  });
}

/* ---- Vòng đời ------------------------------------------------------------ */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  process.env.THUEMAY_VERSION = app.getVersion();
  Menu.setApplicationMenu(null);

  app.whenReady().then(async () => {
    registerIpc();
    try {
      if (DEV_SERVER_URL) {
        // Chế độ phát triển: vite và tsx đã chạy sẵn, chỉ cần mở cửa sổ.
        createWindow(DEV_SERVER_URL);
      } else {
        const port = await startServer();
        createWindow(`http://127.0.0.1:${port}/admin`);
      }
    } catch (error) {
      logFailure('startup', error);
      const { dialog } = await import('electron');
      dialog.showErrorBox(
        'Không khởi động được Thuê Máy Hub',
        `${error instanceof Error ? error.message : String(error)}\n\n`
        + `Chi tiết được ghi tại:\n${join(safeUserData(), 'thuemay-startup-error.log')}`,
      );
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    stopServer();
    app.quit();
  });

  app.on('before-quit', stopServer);
}
