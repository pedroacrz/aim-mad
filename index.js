const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require("socket.io")
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['*']
    }
})
const path = require('path')

let users = {}
let rooms = {}

app.use('/static', express.static(path.join(__dirname, 'assets')))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

app.get('/luxa', (req, res) => {
    res.sendFile(__dirname + '/luxa.html')
})

app.get('/mad', (req, res) => {
    res.sendFile(__dirname + '/mad.html')
})

io.on('connection', (socket) => {

    users[socket.id] = { nick: socket.id, points: 0 }

    io.emit("updatePlayers", users)
    io.emit("updateRooms", rooms)

    socket.on('disconnect', () => {
        delete users[socket.id]
        delete rooms[socket.id]
        io.emit("updatePlayers", users)
        io.emit("updateRooms", rooms)
    })

    socket.on('updateScore', (msg) => {
        users[socket.id].points = msg
        io.emit("updatePlayers", users)
    })

    socket.on("createRoom", (nameRoom) => {
        if (rooms[nameRoom]) {
            return;
        }
        socket.rooms.add(nameRoom)
        rooms[nameRoom] = { owner: socket.id, createdAt: new Date().toISOString() }
        io.emit("updateRooms", rooms)
    })

    socket.on("sendMessage", (msg) => {
        io.to(users[socket.id].room).emit("newMessage", { message: `(${users[socket.id].room}) ${users[socket.id].nick}: ` + msg });
    })

    socket.on("updateNickname", (msg) => {
        users[socket.id].nick = msg
        io.emit("updatePlayers", users)
    })

    socket.on("enterRoom", roomId => {
        socket.join(roomId)
        socket.leave(users[socket.id].room)
        users[socket.id].room = roomId
        console.log(users);
        io.to(roomId).emit("newUserInRoom", { user: 'Server', message: `(${roomId}) ${users[socket.id].nick} entrou na lobby` })

    })
})

app.get('/online', (req, res) => {
    return res.json({ "playersOnline": Object.keys(users).length, "players": users })
})

server.listen(3000, () => {
    console.log('listening on *:3000')
})