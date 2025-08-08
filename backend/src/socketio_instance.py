from flask_socketio import SocketIO

socketio = None

def init_socketio(app):
    global socketio
    socketio = SocketIO(app, cors_allowed_origins="*")
    return socketio

def get_socketio():
    return socketio

