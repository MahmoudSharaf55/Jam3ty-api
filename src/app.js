const express = require('express');
require('./db/mongoose');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(express.json());
app.use(userRouter);
app.use(adminRouter);

app.get('/', function (req, res) {
    res.send("Ok, I'm here");
});
// io.on('connection', (socket) => {
//     socket.on('join', (room, callback) => {
//         socket.join(room);
//         callback('joint');
//     });
// });
module.exports = server;
