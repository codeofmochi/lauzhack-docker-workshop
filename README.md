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

In this task, we will write a simple web server using [ExpressJS](https://expressjs.com/), a popular web framework library.

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

Create a new file named `app.js` and follow the tutorial at [https://expressjs.com/en/starter/hello-world.html](https://expressjs.com/en/starter/hello-world.html).

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

### Chat app