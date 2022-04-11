# lauzhack-docker-workshop

Materials for the LauzHack Days workshop on "Intro to Docker" (April 11, 2022)

Inspired by https://github.com/ageapps/lauzhack-docker-workshop

## Setup

- Install a code editor (example: [Visual Studio Code](https://code.visualstudio.com/))

- Install [NodeJS](https://nodejs.org/en/) ([Linux](https://nodejs.org/en/download/package-manager/), [MacOS](https://nodejs.org/dist/v16.14.2/node-v16.14.2.pkg), [Windows](https://nodejs.org/dist/v16.14.2/node-v16.14.2-x86.msi)) a JavaScript runtime execution environment for back-end and desktop systems to write and run general-purpose JavaScript code

- Install [Docker Engine](https://docs.docker.com/engine/install/)

- Install [Docker Compose](https://docs.docker.com/compose/install/) (depending on your system, this step is not required if you installed Docker through Docker Desktop)

- Create a new directory for the project (for instance in your `Documents` folder) and move inside:
    ```bash
    cd ~/Documents
    mkdir lauzhack-docker-workshop
    cd lauzhack-docker-workshop
    ```

## Task 1

In this task, we will write a simple web server using [ExpressJS](https://expressjs.com/), a popular web framework library. We will simply display a Hello World message to visitors.

```bash
mkdir express-web-server
cd express-web-server
```

Initialize a new project (press Enter until `npm` stops asking for input):

```bash
npm init
```

Install the Express dependency:

```bash
npm install express
```

You should now see a "node_modules" folder, a "package.json" file and a "package-lock.json" file in your folder. These files contain all the dependencies of your software.

Create a new file named `app.js` copy the following web server code:

```js
// import and initialize dependencies
const express = require('express')
const app = express()

const port = 3000

// define a text "Hello World!" response on the root GET route
// i.e. when a client performs a request to http://<hostname>:3000
app.get('/', (req, res) => {
  res.send('Hello World!')
})

// wait for requests indefinitely
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
```

That's it! You now have a working web server.

Once this is complete, you should be able to run and access your web server with:

```bash
node app.js
```

And then by typing http://localhost:3000 in your web browser. You should see a "Hello World!" message.

## Task 2

We will now dockerize this web application by writing a Dockerfile. Create a new file named `Dockerfile` (no extension) in the project directory and write the instructions to build an image which will contain the application.

Hints: find each [Dockerfile instruction in the reference](https://docs.docker.com/engine/reference/builder/) which does the following:

- Start with the [`node` base image](https://hub.docker.com/_/node?tab=description), specifically the `lts-alpine` tag, which is the latest long-term support NodeJS distribution based on Alpine Linux (a very slim image) and which will contain the NodeJS runtime.
- Set the working directory inside your container to the `/app` folder for instance
- Copy `package.json` and `app.js` into the container to this same folder
- Install the dependencies inside the container using `npm install`
- As a good practice, document the port to expose (3000)
- Change the user to an unprivileged user (the `node` image already includes an unprivileged user named `node`). In general, the default user is root by default, it is hence a good practice to use a least privileged user (in case an attacker is able to escape the process sandbox).
- Instruct Docker to run the application with the same command as before

You can now build your application into an immutable image with name `express-web-server` and a tag `v1`:

```bash
docker build -t express-web-server:v1 .
```

Once successfully built, run the container using

```bash
docker run -d -p 3000:3000 express-web-server:v1
```

The `-p` (publish) option binds the internal port 3000 inside the container to the local host port 3000 of the machine.

You should be able to access the web server again using your web browser at http://localhost:3000.

You can also list running containers using:

```
docker ps
```

To stop the container (since we did not implement graceful handling of `SIGTERM` in our application), find the container id using `docker ps` and then:

```
docker kill <container id>
```

### Level up

- Now run the the container using the following command: `docker run -d -p 8000:3000 express-web-server:v1`. On what virtual and local ports does the app run, and what is the URL that you should now type in your web browser to see your app?

- Create a new `Dockerfile` using the newest `current-alpine` NodeJS image version, and give it a new tag `v2`.

- Run locally 2 versions of the app with both versions of Node.js (use different host ports)

- In `app.js`, replace
    ```diff
    - const port = 3000
    + const port = process.env.PORT || 3000
    ```
    Use the `-e` option to change the virtual port of the container

- Create a new `Dockerfile` and instead of using the `node` base image, start with the [`ubuntu:latest`](https://hub.docker.com/_/ubuntu) base image.
    - You will need to automate the installation of NodeJS inside the container, as well as create an unprivileged `node` user

## Task 3

In this task, we will create a more complex application composed of multiple services. We will build a real-time chat application, which is able to persist messages into a [MongoDB](https://www.mongodb.com/) database instance, which can send real-time updates to clients, and which can query a dice roll service to get random numbers through the virtual network.

### Dice roll microservice

Go back to the folder you first created, e.g. `~/Documents/lauzhack-docker-workshop` and create a new directory named `diceroll` and access inside of it:

```bash
cd ~/Documents/lauzhack-docker-workshop
mkdir diceroll
cd diceroll
```

We will create a microservice which will generate a dice roll on each request:

```
npm init
npm install express
```

Create a new file `app.js` and copy the following content:

```js
const express = require('express')
const app = express()
const port = 3001

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

app.get('/', (req, res) => {
  res.json({ value: rollDice() })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
```

You can now roll random numbers by running:

```bash
node app.js
```

in the `diceroll` folder and accessing http://localhost:3001/ (notice the 300**1**). Refresh the page for new random numbers.

Create a new `Dockerfile` and copy the following contents:

```Dockerfile
FROM node:lts-alpine

WORKDIR /app

COPY . /app

RUN npm install

EXPOSE 3001

USER node

CMD ["node", "app.js"]
```

### Chat application

Go back to the folder you first created, e.g. `~/Documents/lauzhack-docker-workshop` and create a new directory named `chat` and access inside of it:

```bash
cd ~/Documents/lauzhack-docker-workshop
mkdir chat
cd chat
```

We will create yet another microservice for the main chat application:

```
npm init
npm install express bulma socket.io mongodb cross-fetch
```

Create a new file `app.js` and copy the following content:

```js
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
```

You will however not be able to run it directly, as this code will attempt to connect to a MongoDB server instance and fail.

Add a `Dockerfile` and copy the following contents:

```Dockerfile
FROM node:lts-alpine

WORKDIR /app

COPY . /app

RUN npm install

EXPOSE 3002

USER node

CMD ["node", "app.js"]
```

### Compose everything together

In the parent directory of the chat and diceroll services, create a new file named `docker-compose.yml`. Have a look at the [Compose specification reference](https://docs.docker.com/compose/compose-file/) for examples and syntax.

It should define a services section with 3 containers:

- the chat application, which should be built from its Dockerfile and which needs to export a public port (e.g. 3002)
- the dice roll microservice, which should be built from its Dockerfile. The chat application expects the service to be named `diceroll`, and will connect to its default port 3001.
- a MongoDB instance, which should be pulled from the `mongo` image. The chat application expects the service to be named `mongodb`, with root username `root` and password `example`.
- optionally, you can add a `mongo-express` instance, which will help you debug the contents of the database

It should define a volumes section with a volume dedicated to the persistent data of the Mongo database, such that data is not lost across application restarts. The volume should be bound to the MongoDB container.

### Level up

- Connect all the computers from a small group of people to the same local area network (e.g. by using the "4G modem" functionality of a smartphone for instance). Boot up the server stack from one computer, find out its local IP address: all computers should be able to access the web interface through the local IP - chat port pair, and you should be able to chat together.

- Modify the code and the docker-compose file such that all environment configuration (such as host names, ports, passwords, ...) are passed as environment variables (for instance, directly through the docker-compose file).