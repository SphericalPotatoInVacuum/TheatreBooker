const electron = require('electron');
const url = require('url');
const path = require('path');
const request = require('request');

const { app, BrowserWindow, Menu, dialog, ipcMain } = electron;

let mainWindow;

// Listen for app to be ready
app.on('ready', () => {
    // Create a new window
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });
    // Maximize our window
    mainWindow.maximize();
    // Load into window
    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'mainWindow.html'),
            protocol: 'file:',
            slashes: true
        })
    );

    // Quit app on mainWindow close
    mainWindow.on('close', e => {
        app.quit();
    });

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert the menu
    Menu.setApplicationMenu(mainMenu);
});

const mainMenuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Update',
                accelerator:
                    process.platform == 'darwin' ? 'Command+U' : 'Ctrl+U',
                click() {
                    mainWindow.webContents.send('update', null);
                }
            },
            {
                label: 'Reload',
                accelerator:
                    process.platform == 'darwin' ? 'Command+R' : 'Ctrl+R',
                click() {
                    mainWindow.reload();
                }
            },
            {
                label: 'Quit',
                accelerator:
                    process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
                click() {
                    app.quit();
                }
            }
        ]
    }
];

if (process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Developer',
        submenu: [
            {
                label: 'Toggle dev tools',
                accelerator:
                    process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            }
        ]
    });
}
