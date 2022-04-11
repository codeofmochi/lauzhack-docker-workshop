const express = require('express')
const http = require('http')
const Socket = require('socket.io').Server
const { MongoClient } = require('mongodb')
const fetch = require('cross-fetch')

const app = express()
const server = http.createServer(app)
const socket = new Socket(server)

const MONGO_URI = "mongodb://root:example@mongodb:27017?maxPoolSize=20&w=majority"
const db = new MongoClient(MONGO_URI)

const DICEROLL_URI = "http://diceroll:3001/"

const port = 3002

app.use('/static', express.static('node_modules/bulma/css'))
app.use('/static', express.static('node_modules/socket.io/client-dist'))

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <link rel="stylesheet" href="/static/bulma.min.css">
                <title>Chat app</title>
                <script src="/static/socket.io.min.js"></script>
                <script>
                    const socket = io()
                    function usernameInput() {
                        return document.getElementById("username")
                    }
                    function messageInput() {
                        return document.getElementById("message")
                    }
                    function onSubmit(event) {
                        event.preventDefault()
                        const username = usernameInput()
                        const message = messageInput()
                        if (username.value && message.value)
                            socket.emit("message", { user: username.value, msg: message.value })
                        message.value = ""
                        return false
                    }
    
                    socket.on('chat', (data) => {
                        document.getElementById("messages").insertAdjacentHTML("afterbegin",\`
                            <div class="box">
                                <article class="media">
                                <div class="media-content">
                                    <div class="content">
                                    <p>
                                        <strong>\$\{data.user\}</strong> <small>\$\{(new Date(data.time)).toLocaleTimeString()\}</small>
                                        <br>
                                        \$\{data.msg\}
                                    </p>
                                    </div>
                                </div>
                                </article>
                            </div>
                        \`)
                    })
                </script>
            </head>
            <body style="padding:20px">
                <div id="form">
                    <form class="box" action="" onsubmit="onSubmit(event)">
                    <div class="field">
                        <label class="label">User name</label>
                        <div class="control">
                            <input class="input" type="text" id="username">
                        </div>
                    </div>

                    <div class="field">
                        <label class="label">Message</label>
                        <div class="control">
                            <input class="input" type="text" id="message">
                        </div>
                    </div>

                    <button class="button is-primary">Send</button>
                    </form>
                </div>
                <div id="messages"></div>
            </body>
        </html>
    `)
})

socket.on('connection', (client) => {
    console.log('New user connected')
    client.on('disconnect', () => {
        console.log('User disconnected')
    })

    db.db("chat").collection("messages").find({}).forEach(doc => {
        client.emit('chat', doc)
    })

    client.on('message', (data) => {
        console.log(JSON.stringify(data))

        const { user, msg } = data
        const time = Date.now()
        const out = { user, msg, time }

        if (msg === "/diceroll") {
            fetch(DICEROLL_URI)
                .then(res => {
                    if (res.status >= 400) throw new Error("Bad response from diceroll server")
                    return res.json()
                })
                .then(data => {
                    const number = data.value
                    socket.emit('chat', { user: "System", msg: `${user} requested a dice roll: ${number}`, time })
                })
                .catch(console.err)
        } else {
            socket.emit('chat', out)
            db.db("chat").collection("messages").insertOne(out).catch(console.err)
        }
    })
})

db.connect()
    .then(() => db.db("admin").command({ ping: 1 }))
    .then(() => {
        console.log("Database connected")
        server.listen(port, () => {
            console.log(`Chat server listening on port ${port}`)
        })
    })
    .catch(console.error)