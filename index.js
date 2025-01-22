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

let users = new Map()


let targetWidth = 50;
let targetHeigth = 50;

let canvaWidth = 700;
let canvaHeigth = 550;

let limitTargetPosition = {
    x: canvaWidth - targetWidth - 50,
    y: canvaHeigth - targetHeigth - 50
}

function randomNumber(max) {
    return Math.floor(Math.random() * max)
}

let game = {
    targetPosition: {
        x: 0,
        y: 10
    }
}

function randomPosition() {
    game.targetPosition = {
        x: randomNumber(limitTargetPosition.x),
        y: randomNumber(limitTargetPosition.y)
    }
}

app.use('/assets', express.static(path.join(__dirname, 'assets')))

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

    users[socket.id] = { nick: 'user_in_lobby', points: 0 }

    io.emit("updatePlayers", users)
    io.emit("gameState", game)

    socket.on('disconnect', () => {
        delete users[socket.id]
        io.emit("updatePlayers", users)
    })

    socket.on("getGame", () => {
        io.to(socket.id).emit(game)
    })

    socket.on("shot", (data) => {
        if (
            game.targetPosition.x < data.x && game.targetPosition.x + targetWidth > data.x
            &&
            game.targetPosition.y < data.y && game.targetPosition.y + targetHeigth > data.y
        ) {
            randomPosition()
            io.emit("gameState", game)
            users[socket.id].points = users[socket.id].points + 1
            io.emit("updatePlayers", users)
        }
    })



    socket.on("sendMessage", (msg) => {
        io.to(users[socket.id].room).emit("newMessage", { message: `(${users[socket.id].room}) ${users[socket.id].nick}: ` + msg });
    })

    socket.on("updateNickname", (msg) => {
        users[socket.id].nick = msg
        io.emit("updatePlayers", users)
    })

    socket.on("enterRoom", roomId => {
        if (users[socket.id].room === roomId) return;
        socket.join(roomId)
        socket.leave(users[socket.id].room)
        users[socket.id].room = roomId
        io.to(roomId).emit("newUserInRoom", { user: 'Server', message: `(${roomId}) ${users[socket.id].nick} entrou na sala` })
    })
})

app.get('/online', (req, res) => {
    return res.json({ "playersOnline": Object.keys(users).length, "players": users })
})

server.listen(3000, () => {
    console.log('listening on *:3000')
})