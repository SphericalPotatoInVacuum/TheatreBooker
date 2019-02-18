const electron = require('electron');
const request = require('request');
const { ipcRenderer } = electron;
let seats;
let prices = [];
let pricezones = {};
let priceclasses = [
    'green accent-1',
    'purple accent-1',
    'pink lighten-4',
    'cyan accent-1',
    'orange lighten-4'
];
let selected = [];
let session_id = null;
let months = [
    'Января',
    'Февраля',
    'Марта',
    'Апреля',
    'Мая',
    'Июня',
    'Июля',
    'Августа',
    'Сентября',
    'Октября',
    'Ноября',
    'Декабря'
];
let price_badges = document.getElementById('price-badges');
let session_name = document.getElementById('session-name');
let date_p = document.getElementById('date-p');
let time_p = document.getElementById('time-p');
let total_p = document.getElementById('total-price');
let selected_p = document.getElementById('selected-p');
let book_btn = document.getElementById('book-btn');
let total_price;

book_btn.addEventListener('click', book);

function update_seats() {
    request(
        `http://127.0.0.1:1337/sessions/${session_id}`,
        (err, res, body) => {
            if (err) {
                console.error(err);
                return;
            }
            let data = JSON.parse(body);
            let date = new Date(data['time']);
            session_name.innerText = data['name'];
            date_p.innerText = `${date.getDay()} ${
                months[date.getMonth() - 1]
            } ${date.getFullYear()}`;
            time_p.innerText = `${date.getHours()}:${date.getMinutes()}`;
        }
    );
    request(`http://127.0.0.1:1337/seats/${session_id}`, (err, res, body) => {
        if (err) {
            console.error(err);
            return;
        }
        data = JSON.parse(body);
        seats = data['items'];
        let badge;
        price_badges.innerHTML = '';
        for (let i = 0; i < data['prices'].length; i++) {
            badge = document.createElement('span');
            badge.className = `new badge ${priceclasses[i]} black-text`;
            badge.setAttribute('data-badge-caption', data['prices'][i]);
            price_badges.appendChild(badge);
            pricezones[data['prices'][i]] = i + 1;
        }

        for (let seat of seats) {
            let seat_el = document.getElementById(seat.number);
            seat_el.id = seat.id;
            if (seat.available) {
                seat_el.className = `${
                    priceclasses[pricezones[seat.price] - 1]
                } available`;
                prices[seat_el.id] = seat.price;
                seat_el.addEventListener('click', selectSeat);
            } else {
                seat_el.className = 'unavailable';
            }
        }
    });
}

function seat_inclination(x) {
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

function selectSeat(e) {
    selected.push(parseInt(e.target.id));
    total_p.innerText = total_price += prices[e.target.id];
    selected_p.innerText = `Вы выбрали ${selected.length} ${seat_inclination(
        selected.length
    )}`;
    e.target.className = 'selected';
    e.target.addEventListener('click', deselectSeat);
    e.target.removeEventListener('click', selectSeat);
    ipcRenderer.send('select', selected.length);
}

function deselectSeat(e) {
    e.target.className = `${
        priceclasses[pricezones[prices[e.target.id]] - 1]
    } available`;
    total_p.innerText = total_price -= prices[e.target.id];
    for (let i = 0; i < selected.length; i++) {
        if (selected[i] == [e.target.id]) {
            selected.splice(i, 1);
        }
    }
    if (selected.length == 0) {
        selected_p.innerText = 'Вы пока не выбрали ни одного места';
    } else {
        selected_p.innerText = `Вы выбрали ${
            selected.length
        } ${seat_inclination(selected.length)}`;
    }
    e.target.addEventListener('click', selectSeat);
    e.target.removeEventListener('click', deselectSeat);
    ipcRenderer.send('deselect', selected.length);
}

function book() {
    let selected_str = JSON.stringify(selected);
    selected_str = selected_str.slice(1, selected_str.length - 1);
    request(
        {
            url: 'http://127.0.0.1:1337/seats/book',
            method: 'POST',
            json: {
                seat_ids: selected_str
            }
        },
        (err, res, body) => {
            if (err) {
                console.error(err);
                return;
            }
            data = body;
            if (data.Error) {
                if (res.statusCode == 400) {
                    ipcRenderer.send('dialog:error', {
                        title: 'Ошибка!',
                        content:
                            'Сначала выберите те места, которые хотите забронировать'
                    });
                }
                return;
            }
            ipcRenderer.send('dialog:message', {
                type: 'info',
                title: '',
                message: `Поздравляем, вы успешно забронировали ${
                    selected.length
                } ${seat_inclination(selected.length)}.\nВаш токен брони:\n${
                    data.token
                }\nСохраните его! Он понадобится вам, если вы захотите отменить вашу бронь.`,
                buttons: ['ОК']
            });
            while (selected.length > 0) {
                document.getElementById(selected.pop()).click();
            }
            ipcRenderer.send('deselect', 0);
            update_seats();
        }
    );
}

ipcRenderer.on('session_id', (e, payload) => {
    session_id = payload;
    update_seats();
});
ipcRenderer.on('update', update_seats);
