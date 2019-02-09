const electron = require('electron');
const url = require('url');
const path = require('path');

const { app, BrowserWindow, Menu } = electron;

let mainWindow;

// Listen for app to be ready
app.on('ready', () => {
    // Create a new window
    mainWindow = new BrowserWindow({});
    // Load into window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert the menu
    Menu.setApplicationMenu(mainMenu);
});

const mainMenuTemplate = [{
    label: 'File'
}];