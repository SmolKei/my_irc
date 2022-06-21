const app = require('express')();
const http = require('http').createServer(app);
const fs = require("fs");
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
const PORT = 4242;

const users = [];
const servers = [];
const his = [];
const server_users = [];

io.on("connection", (socket) => {
    console.log(`connect: ${socket.id}`);

    socket.join("/");
    if (servers[0] !== "/") {
        servers.push("/");
        his["/"] = [];
        server_users["/"] = [];
    }

    socket.currentServer = "/";
    server_users["/"].push(socket.id);

    io.to(socket.id).emit("server", servers);
    io.to(socket.currentServer).emit("msg", his[socket.currentServer]);

    if (!(his.length === 0)) {
        io.to(socket.id).emit("msg", his);
    }

    socket.on("msg", (msg) => {
        console.log(server_users);
        let msgTab = msg.split(" ");
        console.log(msgTab[0]);
            if (!(msgTab[0] === "/join")) {
                let content = [socket.nickname, msg];
                his[socket.currentServer].push(content);
            }
            if (msg[0] === "/" && msg.length > 1) {
                var cmd = msg.match(/[a-z]+\b/)[0];
                var arg = msg.substr(cmd.length + 2, msg.length);
                chat_command(cmd, arg, socket);
            if (cmd === "join" || cmd === "leave") {
                io.to(socket.currentServer).emit("msg", his[socket.currentServer]);
                return null;
            }
        }
        io.to(socket.currentServer).emit("msg", his[socket.currentServer]);
    });
   
    socket.on("disconnect", () => {
        console.log(`disconnect: ${socket.id}`);
    });
    socket.on("user", (user) => {
    socket.nickname = user;
        users.push({
            userID: socket.id,
            username: socket.nickname,
        });
    });
});

io.of("/").adapter.on("create-room", (room) => {
    console.log(`room ${room} was created`);
});

io.of("/").adapter.on("join-room", (room, id) => {
    console.log(`socket ${id} has joined room ${room}`);
});
io.of("/").adapter.on("leave-room", (room, id) => {
    console.log(`socket ${id} has leave room ${room}`);
});

io.of("/").adapter.on("delete-room", (room) => {
    console.log(`room ${room} has been deleted`);
});

    //Command User
function chat_command(cmd, arg, socket) {
    if (
    cmd === "nick" ||
    cmd === "create" ||
    cmd === "delete" ||
    cmd === "join"
    ) {
        if (arg === "") {
            his[socket.currentServer].push([
                ">",
                "Invalid command use, please insert an argument.",
            ]);
            return null;
        }
    }

    //défini les cas de commandes, Private Message still don't work

    switch (cmd) {

        case "nick":
            let notice = socket.nickname + " changed their name to " + arg;
            users.forEach((el) => {
                if (el.username === socket.nickname) {
                el.username = arg;
                }
            });
        socket.nickname = arg;
        his[socket.currentServer].push([">", notice]);
        io.emit("userchange", {
            nick: socket.nickname,
            msg: his[socket.currentServer],
        });
        break;

    case "create":
        if (servers.includes(arg)) {
            his[socket.currentServer].push([
                ">",
                "Channel already exists. Please choose a different name.",
            ]);
            break;
        }
        his.forEach((channel) => {
            console.log(channel);
            channel.push([">", `Channel ${arg} has been created.`]);
        });
        his[arg] = [];
        servers.push(arg);
        server_users[arg] = [];
        io.emit("server", servers);
        break;

    case "delete":
        if (arg === "/") {
            his[socket.currentServer].push([">", "Can't delete general channel"]);
            break;
        }

        his.forEach((channel) => {
            channel.push([">", `Channel ${arg} has been deleted.`]);
        });
        servers.splice(servers.indexOf(arg), 1);
        io.emit("server", servers);
        if (socket.currentServer === arg) {
            socket.leave(arg);
            socket.join("/");
            socket.currentServer = "/";
        }
        server_users[arg].forEach((token) => {
            io.to(token).emit("storeIsClosing", true);
        });
        server_users.splice(server_users.indexOf(arg), 1);
        break;

    case "join":
        if (!servers.includes(arg)) {
            his[socket.currentServer].push([">", "Channel doesn't exist."]);
            break;
        }
        socket.leave(socket.currentServer);
        socket.join(arg);
        server_users[socket.currentServer].splice(
        server_users[socket.currentServer].indexOf(socket.id),
        1
        );
        server_users[arg].push(socket.id);
        socket.currentServer = arg;
        break;

    case "leave":
        if (socket.currentServer !== arg) {
            his[socket.currentServer].push([
            ">",
            "Can't leave server that the user is not in.",
            ]);
            break;
        }
        socket.currentServer = "/";
        break;

    case "users":
        console.log(users);
        server_users[socket.currentServer].forEach((token) => {
            users.forEach((user) => {
                if (user.userID === token) {
                    let content = [">", user.username];
                    his[socket.currentServer].push(content);
                }
            });
        });
        break;

    case "list":
        servers.forEach((el) => {
            let content = [">", el];
            his[socket.currentServer].push(content);
        });
        break;

    case "help":
        his[socket.currentServer].push(
            [">", "commands:"],
            [">", "/nick 'name': changes username"],
            [">", "/create 'name': creates channel"],
            [">", "/join 'name': joins existing channel"],
            [">", "/leave 'name': leaves channel 'name' and joins general channel"],
            [">", "/delete 'name': deletes channel"],
            [">", "/users: displays all users on current channel"],
            [
            ">",
            "/list 'search': lists all channels containing 'search' w/ parameter lists all channels",
            ],
            [">", "/users : displays all users on current channel"],
            [">", "/msg 'username' 'msg': sends private 'msg' to 'username'"]
        );
        break;

    case "msg":
        socket.on("privateMessage", ({ content, to }) => {
            socket.to(to).emit("private message", {
                content,
                from: socket.id,
                });
            });

        break;

    default:
        console.log("That is not a valid command.");
        break;
    }
}

http.listen(PORT, () =>  {
    console.log(`Listening on *:${PORT}`);
});