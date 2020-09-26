from flask import Flask, request
from flask_restful import Resource, Api, reqparse
from flask_sqlalchemy import SQLAlchemy
from json import dumps
from flask_jsonpify import jsonify
from datetime import datetime
from hashlib import md5
from config import base_price, seat_coefs
from uuid import uuid4
from os import environ

# Initialize flask app and api
app = Flask(__name__)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///theatre.db'
db = SQLAlchemy(app)
api = Api(app)

token_hash = environ.get('TOKEN_HASH', None)
if token_hash is None:
    print('token_hash was not specified')
    exit(1)


class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    time = db.Column(db.DateTime, nullable=False)
    price_coef = db.Column(db.Float, nullable=False)
    seats_left = db.Column(db.Integer, nullable=False)
    seats = db.relationship('Seat', backref='session',
                            cascade='delete, save-update')

    def __init__(self, name=None, time=None,
                 price_coef=1.0, seats_left=1147):
        super(Session, self).__init__(
            id=None, name=name,
            time=datetime.strptime(time, '%Y-%m-%d %H:%M')
            if time is not None else datetime.utcnow(),
            price_coef=price_coef, seats_left=seats_left
        )
        last = Session.query.order_by(Session.id.desc()).first()
        self.id = last.id + 1 if last is not None else 1
        prices = [None] * 1147
        for x in seat_coefs.keys():
            prices[x[0] - 1:x[1]] = \
                [base_price * seat_coefs[x] * self.price_coef] \
                * (x[1] - x[0] + 1)
        self.seats = [
            Seat(id=(self.id - 1) * 1147 + i, number=i, price=prices[i - 1],
                 session_id=self.id)
            for i in range(1, 1148)
        ]

    def __repr__(self):
        return '<Session %r>' % self.id

    def toDict(self):
        d = {
            'id': self.id,
            'name': self.name,
            'time': datetime.strftime(self.time, '%Y-%m-%d %H:%M'),
            'price_coef': self.price_coef,
            'seats_left': self.seats_left
        }
        return d


class Seat(db.Model):
    id = db.Column(db.Integer, primary_key=True, unique=True)
    number = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Integer, nullable=False)
    available = db.Column(db.Boolean, nullable=False, default=True)
    holder_token = db.Column(db.String(32))
    session_id = db.Column(db.Integer, db.ForeignKey('session.id'),
                           nullable=False)

    def __repr__(self):
        return '<Seat %r>' % self.id

    def toDict(self):
        d = {
            'id': self.id,
            'number': self.number,
            'price': self.price,
            'available': self.available
        }
        return d


class BookToken(db.Model):
    token = db.Column(db.String(32), primary_key=True, unique=True)
    issue_time = db.Column(db.DateTime)
    expiry_time = db.Column(db.DateTime)


# ================= Classes responsible for request handling ==================


class Sessions(Resource):
    def get(self):
        sessions = session.query(Session).all()
        result = {'items': [s.toDict()for s in sessions]}
        return jsonify(result)

    def post(self):
        args = post_parser.parse_args()

        if args.get('token', None) is None:
            return {'Error': 'No access token was provided'}, 401
        elif md5(args['token'].encode('utf-8')).hexdigest() != token_hash:
            return {'Error': 'Invalid access token'}, 401

        s = Session(name=args['name'], time=args['time'],
                    price_coef=float(args['price_coef']))

        response = s.toDict()
        session.add(s)
        session.commit()
        session.close()
        return response


class Sessions_id(Resource):
    def get(self, session_id):
        s = Session.query.filter_by(id=session_id).first()
        if s is None:
            return {'Error': 'No such session id'}, 404
        return s.toDict()

    def delete(self, session_id):
        args = del_parser.parse_args()
        if args.get('token', None) is None:
            return {'Error': 'No access token was provided'}, 401
        elif md5(args['token'].encode('utf-8')).hexdigest() != token_hash:
            return {'Error': 'Invalid access token'}, 401
        s = Session.query.filter_by(id=session_id).first()
        if s is None:
            return {'Error': 'Id not found'}, 404
        response = s.toDict()
        session.delete(s)
        session.commit()
        session.close()
        return response


class Seats_session_id(Resource):
    def get(self, session_id):
        seats = Seat.query.filter_by(session_id=session_id).all()
        prices = sorted(list(set([s.price for s in seats])))
        return {'items': [s.toDict() for s in seats], 'prices': prices}


class Seats_seat_id(Resource):
    def post(self):
        args = book_parser.parse_args()
        if args['seat_ids'] is None or args['seat_ids'] == '':
            return {'Error': 'You must provide seat ids'}, 400
        seat_ids = map(int, args['seat_ids'].split(','))
        seats = []
        for seat_id in seat_ids:
            seat = Seat.query.filter_by(id=seat_id).first()
            if not seat.available:
                return {
                    'Error': 'Booking overlap'
                }, 403
            seats.append(seat)
        token = uuid4().hex
        while BookToken.query.filter_by(token=token).first() is not None:
            token = uuid4().hex
        for seat in seats:
            seat.holder_token = token
            seat.available = False
        session_l = Session.query.filter_by(id=seats[0].session_id).first()
        session_l.seats_left -= len(seats)
        session.add(BookToken(token=token, expiry_time=seats[0].session.time))
        session.commit()
        session.close()
        return {'result': 'OK', 'token': token}

    def delete(self):
        args = unbook_parser.parse_args()
        if args.get('token', '') == '':
            return {'Error': 'No access token was provided'}, 400
        token = args['token']
        book_token = BookToken.query.filter_by(token=token).first()
        if book_token is None:
            return {
                'Error': 'Book token is not valid. '
                'It is expired or not yet created'
            }, 401
        if book_token.expiry_time < datetime.now():
            session.delete(book_token)
            return {
                'Error': 'Book token is not valid. '
                'It is expired or not yet created'
            }, 401
        seats = Seat.query.filter_by(holder_token=args['token']).all()
        session_l = Session.query.filter_by(id=seats[0].session_id).first()
        session_l.seats_left += len(seats)
        response = {'items': []}
        for seat in seats:
            seat.available = True
            seat.holder_token = None
            response['items'].append(seat.toDict())
        session.delete(book_token)
        session.commit()
        session.close()
        return response


# Create all tables
db.create_all()
session = db.session

# Initialize request parser to parse POST request when adding sessions
post_parser = reqparse.RequestParser()
post_parser.add_argument('name')
post_parser.add_argument('time')
post_parser.add_argument('price_coef')
post_parser.add_argument('token')

# Initialize request parser to parse POST request when adding sessions
del_parser = reqparse.RequestParser()
del_parser.add_argument('token')

# Initialize request parser to parse POST request when booking seats
book_parser = reqparse.RequestParser()
book_parser.add_argument('seat_ids')

# Initialize request parser to parse DELETE request when booking seats
unbook_parser = reqparse.RequestParser()
unbook_parser.add_argument('token')


# Map routes to dedicated classes
api.add_resource(Sessions, '/sessions')
api.add_resource(Sessions_id, '/sessions/<session_id>')
api.add_resource(Seats_session_id, '/seats/<session_id>')
api.add_resource(Seats_seat_id, '/seats/book')

if __name__ == '__main__':
    app.run(port=1337)
