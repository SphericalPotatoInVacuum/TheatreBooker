const request = require('request');
const { ipcRenderer } = require('electron');

let access_token = null;

let refresh_btn = document.getElementById('refresh-btn');
let add_btn = document.getElementById('add-btn');
let delete_old_btn = document.getElementById('delete-old-btn');
let update_token_btn = document.getElementById('update-token');
let sessions_tbody = document.getElementById('sessions-tbody');
let token_input = document.getElementById('token');

refresh_btn.addEventListener('click', update_sessions);
add_btn.addEventListener('click', () => {
    ipcRenderer.send('session:add');
});
delete_old_btn.addEventListener('click', () => {});
update_token_btn.addEventListener('click', () => {
    access_token = token_input.value;
});

function update_sessions() {
    request(`http://127.0.0.1:1337/sessions`, (err, res, body) => {
        if (err) {
            console.error(err);
            return;
        }
        let data = JSON.parse(body);
        sessions = data['items'];
        sessions_tbody.innerHTML = '';
        for (let session of sessions) {
            insert_session_row(session);
        }
    });
}

function insert_session_row(session) {
    let tr = document.createElement('tr');
    let tds = [];
    for (let i = 0; i < 5; i++) {
        tds.push(document.createElement('td'));
    }
    let del_btn = document.createElement('a');
    del_btn.className = 'waves-effect waves-light btn';
    del_btn.innerHTML = '<i class="material-icons left">delete</i>Удалить';
    let edit_btn = document.createElement('a');
    edit_btn.className = 'waves-effect waves-light btn';
    edit_btn.innerHTML = '<i class="material-icons left">edit</i>Изменить';
    tds[0].innerText = session.name;
    tds[1].innerText = session.time;
    tds[2].innerText = session.seats_left;
    tds[3].innerText = session.price_coef;
    tds[4].appendChild(del_btn);
    tds[4].appendChild(edit_btn);
    for (let td of tds) {
        tr.appendChild(td);
    }
    sessions_tbody.appendChild(tr);
}
