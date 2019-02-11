from flask import Flask, request
from flask_restful import Resource, Api, reqparse
from sqlalchemy.sql import select, insert, delete
from sqlalchemy.orm import mapper, sessionmaker, relationship
from sqlalchemy import create_engine, MetaData, Table, Column, ForeignKey
from sqlalchemy import Boolean, Integer, Date, String, Float, Text
from json import dumps
from flask_jsonpify import jsonify
from datetime import datetime
from hashlib import md5
from config import base_price, price_coefs, token_hash


# ================= Classes responsible for database mapping ==================

class Session(object):
    def __init__(self, id=None, name=None, date_time=None,
                 seats_left=1147, price_coef=1.0):
        self.id = id
        self.name = name
        self.date_time = date_time
        self.seats_left = seats_left
        self.price_coef = price_coef

    def __repr__(self):
        return ('Session #{}\nName: "{}"\nTime: {}\nSeats left: {}'
                ''.format(self.id, self.name,
                          self.date_time, self.seats_left))

    def makeSeats(self):
        prices = [None] * 1147
        for x in price_coefs.keys():
            prices[x[0] - 1:x[1]] = \
                [base_price * price_coefs[x] * self.price_coef] \
                * (x[1] - x[0] + 1)
        return [Seat(int(str(self.id) + str(i)), i, self.id, prices[i - 1])
                for i in range(1, 1148)]

    def toDict(self):
        d = {
            'id': self.id,
            'name': self.name,
            'date_time': self.date_time,
            'seats_left': self.seats_left
        }
        return d


class Seat(object):
    def __init__(self, id, number, session_id, price, available=True):
        self.id = id
        self.number = number
        self.session_id = session_id
        self.price = price
        self.available = available

    def __repr__(self):
        return ('Seat #{}\nSession-relative id:{}\nSession id:{}\nPrice:{}'
                ''.format(self.id, self.number, self.session_id, self.price))

    def toDict(self):
        d = {
            'id': self.id,
            'number': self.number,
            'price': self.price,
            'available': self.available
        }
        return d


# ================= Classes responsible for request handling ==================

class Sessions(Resource):
    def get(self):
        sessions = session.query(Session).all()
        result = {'items': [s.toDict()for s in sessions]}
        return jsonify(result)

    def post(self):
        args = post_parser.parse_args()
        if args.get('token', None) is None:
            return {'Error': 'No access token was provided'}
        elif md5(args['token'].encode('utf-8')).hexdigest() != token_hash:
            return {'Error': 'Invalid access token'}
        s = Session(name=args['name'],
                    date_time=datetime.strptime(
                        args['date_time'], '%Y-%m-%d %H:%M'),
                    price_coef=args['price_coef'])
        session.add(s)
        session.commit()
        seats = s.makeSeats()
        sid = s.id
        session.add_all(seats)
        session.commit()
        session.close()
        return {'id': sid}


class Sessions_id(Resource):
    def get(self, session_id):
        s = session.query(Session) \
            .filter_by(id=session_id) \
            .first()
        if s is None:
            return {'Error': 'No such session id'}
        return s.toDict()

    def delete(self, session_id):
        args = del_parser.parse_args()
        if args.get('token', None) is None:
            return {'Error': 'No access token was provided'}
        elif md5(args['token'].encode('utf-8')).hexdigest() != token_hash:
            return {'Error': 'Invalid access token'}
        s = session.query(Session) \
            .filter_by(id=session_id) \
            .first()
        if s is None:
            return {'Error': 'Id not found'}, 404
        seats = session.query(Seat).filter_by(session_id=s.id).all()
        response = s.toDict()
        session.delete(s)
        session.commit()
        session.close()
        return response


class Seats_session_id(Resource):
    def get(self, session_id):
        seats = session.query(Seat).filter_by(session_id=session_id)
        return {'items': [s.toDict() for s in seats]}


# Initialize database engine
engine = create_engine('sqlite:///theatre.db')
metadata = MetaData()

# Initialize database tables for mapping
sessions_table = Table('sessions', metadata,
                       Column('id', Integer, primary_key=True, nullable=False),
                       Column('name', String),
                       Column('date_time', Text),
                       Column('price_coef', Float),
                       Column('seats_left', Integer))

seats_table = Table('seats', metadata,
                    Column('id', Integer, primary_key=True, nullable=False),
                    Column('number', Integer),
                    Column('session_id', Integer, ForeignKey('sessions.id')),
                    Column('price', Integer),
                    Column('available', Boolean))

metadata.create_all(engine)      # Create metadata
mapper(Session, sessions_table, properties={
       'seats': relationship(Seat, backref='sessions', cascade='delete')
       })
mapper(Seat, seats_table)

# Create database session and bind it to the engine
session = sessionmaker(bind=engine)()

# Initialize flask app and api
app = Flask(__name__)
api = Api(app)

# Initialize request parser to parse POST request when adding sessions
post_parser = reqparse.RequestParser()
post_parser.add_argument('name')
post_parser.add_argument('date_time')
post_parser.add_argument('price_coef')
post_parser.add_argument('token')

# Initialize request parser to parse POST request when adding sessions
del_parser = reqparse.RequestParser()
del_parser.add_argument('token')

# Map routes to dedicated classes
api.add_resource(Sessions, '/sessions')
api.add_resource(Sessions_id, '/sessions/<session_id>')
api.add_resource(Seats_session_id, '/seats/<session_id>')

if __name__ == '__main__':
    app.run(port=1337)
