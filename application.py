import os
import time
import datetime

from flask import Flask, render_template, request
from flask_socketio import SocketIO, send, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

stored_messages = {"General": []}
channels = ["General"]
users = []
current_channel = "General"
current_user = ""

@socketio.on("load channel")
def load(page):
    print (page)
    pagetoload = page["channel"]
    username = page['user']
    if pagetoload in channels:
        join_room(pagetoload)
        print("updated channel to "+ pagetoload)
        emit("old chats", stored_messages[pagetoload], room=pagetoload)
    else:
        join_room(current_channel)
        emit("old chats", current_channel, room=current_channel)

@app.route("/")
def index():
    if current_channel in stored_messages:
        socketio.emit("old chats", stored_messages[current_channel], broadcast=True)
    return render_template("index.html", channels=channels)

@socketio.on('private chat')
def load_private(private_page):
    current_user = private_page["user1"]
    username = private_page["user2"]
    channel = current_user + "&" + username
    if channel not in channels:
        channels.append(channel)
        stored_messages[channel] = []
    user = list(filter(lambda userid: user['username'] == user, users))
    userid = user[0]['userid']
    emit("old chats", stored_messages[channel], room=userid)
    print(stored_messages[channel])

@socketio.on('private message input')
def private_messagefn(messageinput):
    # get timestamp
    day = datetime.date.today().strftime("%A")
    timestamp = datetime.datetime.now().strftime("%I:%M %p")
    time = day + " " + timestamp
    username = messageinput["user"]
    user2 = messageinput["user2"]
    private_channel = username + "&" + user2
    user = list(filter(lambda userid: user['username'] == user2, users))
    room = user[0]['userid']
    # get message data
    message = messageinput["message"]
    messagedata = {'username': username, 'message': message, 'time': time, 'channel': private_channel}

    if private_channel not in stored_messages.keys():
        stored_messages[private_channel] = []
        stored_messages[private_channel].append(messagedata)
    else:
        stored_messages[private_channel].append(messagedata)

    if len(stored_messages[private_channel]) > 100:
        stored_messages[private_channel].pop(0)

    print(stored_messages)
    emit("message data", messagedata, room=room)

@socketio.on("store user")
def user(userdata):
    name = userdata["username"]
    if not list(filter(lambda user: user['username'] == name, users)):
        users.append({'username': name, 'userid': request.sid})
        current_user = name
    else:
        emit("user error", "Display name is taken. Try another.", broadcast=False)

@socketio.on("store existing user")
def user(userdata):
    # update existing users
    global current_user
    name = userdata["username"]
    current_user = name
    print("updating"+current_user)
    if not list(filter(lambda user: user['username'] == name, users)):
        users.append({'username': name, 'userid': request.sid})
        print(users)
    else:
        for user in users:
            for k,v in user.items():
                if v == 'name':
                    user['userid'] = request.sid
        print(users)

@socketio.on("create channel")
def channel(data):
    channel = data["channel"]
    if channel not in channels:
        channels.append(channel)
        stored_messages[channel] = []
    print(channels)
    print(stored_messages)
    emit("show channel", channels, broadcast=True)

@socketio.on("message input")
def messagefn(messageinput):
    day = datetime.date.today().strftime("%A")
    timestamp = datetime.datetime.now().strftime("%I:%M %p")
    time = day + " " + timestamp
    room = messageinput["channel"]
    username = messageinput["user"]
    message = messageinput["message"]
    messagedata = {'username': username, 'message': message, 'time': time, 'channel': room}
    print(messagedata)
    if room not in stored_messages.keys():
        stored_messages[room] = []
        stored_messages[room].append(messagedata)
    else:
        stored_messages[room].append(messagedata)

    if len(stored_messages[room]) > 100:
        stored_messages[room].pop(0)

    print(stored_messages)
    emit("message data", messagedata, room=room)
