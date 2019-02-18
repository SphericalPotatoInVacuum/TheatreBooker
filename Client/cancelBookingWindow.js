const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('continue').addEventListener('click', e => {
        ipcRenderer.send('cancelbooking', {
            token: document.getElementById('token').value
        });
    });
    document.getElementById('cancel').addEventListener('click', e => {
        ipcRenderer.send('cancelcancelbooking');
    });
});
