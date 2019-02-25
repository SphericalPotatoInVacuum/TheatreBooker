const electron = require('electron');
const request = require('request');
const { ipcRenderer } = electron;

let slider;
let menu_btns = [];
let sessions_row;
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
let back_to_sessions = document.getElementById('back-to-sessions');
let back_to_menu_1 = document.getElementById('back-to-menu-1');
let back_to_menu_2 = document.getElementById('back-to-menu-2');
let total_price = 0;

document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.slider');
    sessions_row = document.getElementById('sessions-row');
    slider = instances = M.Slider.init(elems, {
        duration: 500,
        interval: 0,
        indicators: false
    })[0];
    slider.pause();
    menu_btns = document.querySelectorAll('.menu-btn');
    menu_btns[0].addEventListener('click', e => {
        update_sessions();
        slider.set(1);
        slider.pause();
    });
    menu_btns[1].addEventListener('click', e => {
        ipcRenderer.send('cancelbooking', 0);
    });
    menu_btns[2].addEventListener('click', e => {
        slider.set(3);
        slider.pause();
    });
    menu_btns[3].addEventListener('click', e => {
        ipcRenderer.send('quit');
    });
    back_to_sessions.addEventListener('click', e => {
        update_sessions();
        slider.set(1);
        slider.pause();
    });
    back_to_menu_1.addEventListener('click', e => {
        slider.set(0);
        slider.pause();
    });
    back_to_menu_2.addEventListener('click', e => {
        slider.set(0);
        slider.pause();
    });
});

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

function update_sessions() {
    request(`http://127.0.0.1:1337/sessions`, (err, res, body) => {
        if (err) {
            console.error(err);
            return;
        }
        let data = JSON.parse(body);
        sessions = data['items'];
        sessions_row.innerHTML = '';
        for (let session of sessions) {
            insert_session_card(session);
        }
    });
}

function insert_session_card(session) {
    let col = document.createElement('div');
    col.className = 'col s4';
    let card = document.createElement('div');
    card.className = 'card small';
    let card_img = document.createElement('div');
    card_img.className = 'card-image image-overflow';
    let img = document.createElement('img');
    img.setAttribute('src', 'images/theatre.jpg');
    let card_title = document.createElement('span');
    card_title.className = 'card-title';
    card_title.innerText = session.name;
    let card_cont = document.createElement('div');
    card_cont.className = 'card-content';
    let time = new Date(session.time);
    let date_p = document.createElement('p');
    date_p.className = 'valign-wrapper';
    date_p.innerHTML = `<i class="material-icons" style="font-size: inherit; line-height: inherit">calendar_today</i>&nbsp;&nbsp;${time.getDate()} ${
        months[time.getMonth()]
    } ${time.getFullYear()}`;
    let time_p = document.createElement('p');
    time_p.className = 'valign-wrapper';
    time_p.innerHTML = `<i class="material-icons" style="font-size: inherit; line-height: inherit">access_time</i>&nbsp;&nbsp;${time.getHours()}:${time.getMinutes()}`;
    let seats_p = document.createElement('p');
    seats_p.className = 'valign-wrapper';
    seats_p.innerHTML = `<i class="material-icons" style="font-size: inherit; line-height: inherit">event_seat</i>&nbsp;&nbsp;Свободно мест: ${
        session.seats_left
    }/1147`;
    let card_action = document.createElement('div');
    card_action.className = 'card-action';
    let book_a = document.createElement('a');
    book_a.href = '#';
    book_a.innerText = 'Забронировать';
    book_a.addEventListener('click', e => {
        session_id = e.target.session_id;
        update_seats();
        slider.set(2);
        slider.pause();
    });
    book_a.session_id = session.id;

    card_img.appendChild(img);
    card_img.appendChild(card_title);
    card_cont.appendChild(date_p);
    card_cont.appendChild(time_p);
    card_cont.appendChild(seats_p);
    card_action.appendChild(book_a);
    card.appendChild(card_img);
    card.appendChild(card_cont);
    card.appendChild(card_action);
    col.appendChild(card);
    sessions_row.appendChild(col);
}

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
            date_p.innerText = `${date.getDate()} ${
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
            seat_el.seat_id = seat.id;
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

function selectSeat(e) {
    selected.push(parseInt(e.target.seat_id));
    total_p.innerText = `${(total_price += prices[e.target.id])} р.`;
    selected_p.innerText = `Вы выбрали ${selected.length} ${seat_inclination(
        selected.length
    )}`;
    e.target.className = 'selected';
    e.target.addEventListener('click', deselectSeat);
    e.target.removeEventListener('click', selectSeat);
    ipcRenderer.send('update:selected', selected.length);
}

function deselectSeat(e) {
    e.target.className = `${
        priceclasses[pricezones[prices[e.target.id]] - 1]
    } available`;
    total_p.innerText = `${(total_price -= prices[e.target.id])} р.`;
    for (let i = 0; i < selected.length; i++) {
        if (selected[i] == [e.target.seat_id]) {
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
                id = selected.pop() % 1147;
                if (id == 0) {
                    id = 1147;
                }
                document.getElementById(id).click();
            }
            ipcRenderer.send('update:selected', 0);
            update_seats();
        }
    );
}

ipcRenderer.on('update', update_seats);
