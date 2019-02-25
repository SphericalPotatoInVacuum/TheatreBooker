const electron = require('electron');
const url = require('url');
const path = require('path');
const request = require('request');

const { app, BrowserWindow, Menu, dialog, ipcMain } = electron;

let mainWindow, cancelBookingWindow;
let selected_cnt = 0;

function seat_inclination(x) {
    if (x > 9 && x < 21) {
        return 'мест';
    }
    switch (x % 10) {
        case 1:
            return 'место';
        case 2:
        case 3:
        case 4:
            return 'места';
        default:
            return 'мест';
    }
}

// Listen for app to be ready
app.on('ready', () => {
    // Create a new window
    mainWindow = new BrowserWindow({});
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
        if (selected_cnt == 0) {
            app.quit();
            return;
        }
        const quit = dialog.showMessageBox({
            type: 'warning',
            title: 'Вы уверены?',
            message: `Вы уверены, что хотите выйти? Вы выбрали, но так и не забронировали ${selected_cnt} ${seat_inclination(
                selected_cnt
            )}`,
            buttons: ['Да', 'Нет']
        });
        if (quit == 1) {
            e.preventDefault();
        }
    });

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert the menu
    Menu.setApplicationMenu(mainMenu);
});

ipcMain.on('update:selected', (e, payload) => {
    selected_cnt = payload;
});

ipcMain.on('dialog:error', (e, payload) => {
    const errd = dialog.showErrorBox(payload.title, payload.content);
});

ipcMain.on('dialog:message', (e, payload) => {
    const msgd = dialog.showMessageBox(payload);
});

ipcMain.on('cancelbooking', (e, payload) => {
    if (payload == 0) {
        cancelBookingWindow = new BrowserWindow({
            width: 600,
            height: 316,
            resizable: false
        });
        // Load into window
        cancelBookingWindow.loadURL(
            url.format({
                pathname: path.join(__dirname, 'cancelBookingWindow.html'),
                protocol: 'file:',
                slashes: true
            })
        );
    } else {
        request(
            {
                url: 'http://127.0.0.1:1337/seats/book',
                method: 'DELETE',
                json: {
                    token: payload.token
                }
            },
            (err, res, body) => {
                if (err) {
                    console.error(err);
                    return;
                }
                if (res.statusCode == 400) {
                    dialog.showErrorBox(
                        'Укажите ваш бронировачный токен',
                        'Вы должны предоставить токен, который вам выдали при бронировании билетов. Без него вы не сможете отменить бронь'
                    );
                    return;
                } else if (res.statusCode == 401) {
                    dialog.showErrorBox(
                        'Невалидный токен',
                        'Предоставленный вами токен не существует или истёк его срок годности'
                    );
                    return;
                } else {
                    dialog.showMessageBox({
                        title: 'Успешно!',
                        message: `Вы успешно отменили бронь на ${
                            body.items.length
                        } ${seat_inclination(body.items.length)}`,
                        buttons: ['ОК']
                    });
                    cancelBookingWindow.close();
                    cancelBookingWindow = null;
                }
            }
        );
    }
});

ipcMain.on('cancelcancelbooking', () => {
    cancelBookingWindow.close();
    cancelBookingWindow = null;
});

ipcMain.on('quit', () => {
    mainWindow.close();
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
