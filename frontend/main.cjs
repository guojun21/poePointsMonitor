const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let backendProcess = null;
let mainWindow = null;

// 检查后端是否已经在运行
function checkBackendRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:58232/api/stats', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startBackend() {
  // 首先检查后端是否已经在运行
  const isRunning = await checkBackendRunning();
  if (isRunning) {
    console.log('Backend already running on port 58232');
    return;
  }

  const isDev = !app.isPackaged;
  
  let backendPath;
  if (isDev) {
    // 开发环境：使用已编译的二进制文件
    backendPath = path.join(__dirname, '..', 'backend', 'poe-backend');
    try {
      const fs = require('fs');
      if (fs.existsSync(backendPath)) {
        backendProcess = spawn(backendPath, ['-port', '58232']);
      } else {
        // 如果没有二进制文件，尝试 go run
        const goPath = path.join(__dirname, '..', 'backend', 'main.go');
        backendProcess = spawn('go', ['run', goPath, '-port', '58232'], {
          cwd: path.join(__dirname, '..', 'backend')
        });
      }
    } catch (err) {
      console.error('Failed to start backend:', err);
      return;
    }
  } else {
    // 生产环境：使用打包后的二进制文件
    backendPath = path.join(process.resourcesPath, 'poe-points-backend');
    backendProcess = spawn(backendPath, ['-port', '58232']);
  }

  if (backendProcess) {
    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0b',
  });

  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:58233');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startBackend();
  
  // 等待后端启动
  setTimeout(() => {
    createWindow();
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
