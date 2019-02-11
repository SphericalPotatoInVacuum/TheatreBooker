const electron = require("electron");
const url = require("url");
const path = require("path");

const { app, BrowserWindow, Menu, dialog } = electron;

let mainWindow, confirmWindow;

// Listen for app to be ready
app.on("ready", () => {
    // Create a new window
    mainWindow = new BrowserWindow({});
    // Maximize our window
    mainWindow.maximize();
    // Load into window
    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "mainWindow.html"),
            protocol: "file:",
            slashes: true
        })
    );

    // Quit app on mainWindow close
    mainWindow.on("close", e => {
        const quit = dialog.showMessageBox({
            type: "warning",
            title: "Are you sure?",
            message:
                "Are you sure you want to quit? You have some selected, but not yet booked seats.",
            buttons: ["Yes", "No"]
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

const mainMenuTemplate = [
    {
        label: "File",
        submenu: [
            {
                label: "Update",
                accelerator:
                    process.platform == "darwin" ? "Command+U" : "Ctrl+U",
                click() {
                    mainWindow.reload();
                }
            },
            {
                label: "Quit",
                accelerator:
                    process.platform == "darwin" ? "Command+Q" : "Ctrl+Q",
                click() {
                    app.quit();
                }
            }
        ]
    }
];

if (process.env.NODE_ENV !== "production") {
    mainMenuTemplate.push({
        label: "Developer",
        submenu: [
            {
                label: "Toggle dev tools",
                accelerator:
                    process.platform == "darwin" ? "Command+I" : "Ctrl+I",
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            }
        ]
    });
}
