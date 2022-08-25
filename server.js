let express = require('express');
let app = express();

let http = require('http');
let server = http.Server(app);

let socketIO = require('socket.io');
let io = socketIO(server);

let {v4: uuidv4} = require('uuid');
const EstimationMethod = require('./contracts/estimationMethods');
const Room = require('./contracts/room');
const stateRoom = require('./contracts/stateRoom');

const port = process.env.PORT || 3000;

//------- Sessions -------//
const sessionRooms = [];

const session1 = new Room({ id: 'Silvally', name: 'Silvally', estimationMethod: EstimationMethod.fibonacci, description: 'Testing room 1', users: [], createdBy: '', createdAt: Date.now() });
const session2 = new Room({ id: 'FE', name: 'FrontEnd', estimationMethod: EstimationMethod.fibonacci, description: 'Testing room 1', users: [], createdBy: '', createdAt: Date.now() });
const session3 = new Room({ id: uuidv4(), name: 'BackEnd', estimationMethod: EstimationMethod.numericSequence, description: 'Testing room 1', users: [], createdBy: '', createdAt: Date.now() });

sessionRooms.push(session1);
sessionRooms.push(session2);
sessionRooms.push(session3);

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('join', () => {
        socket.join('general');
        socket.emit('rooms-list', sessionRooms);
    });

    socket.on("disconnect", (reason) => {
        const rooms = [];
        sessionRooms.forEach(room => {
            room.users.forEach((user, index) => {
                if (user.id === socket.data.id) {
                    room.users.splice(index, 1);
                    // TODO: I will change it for to break the loop when the user is found
                    rooms.push(room);
                }
            });
        });

        rooms.forEach(room => {
            if (room.state == stateRoom.result) {
                return;
            }
            let tmpRoom = room;
            if (room.stateRoom == stateRoom.vote) {
                 tmpRoom = createRoomCopy(room);
            }
            io.sockets.in(room.id).emit('user-joined-room', { room: tmpRoom });
            socket.broadcast.to('general').emit('rooms-list', sessionRooms);
        });
    });

    socket.on('create-room', (room) => {
        if (sessionRooms.find(elem => elem.name === room.name)) {
            console.log('Room already exists');
            socket.emit('room-exists', room);
        } else {
            const newRoom = new Room({ ...room, id: uuidv4(), users: [], owner: socket.data.name, createdAt: Date.now() });
            sessionRooms.push(newRoom);
            io.to('general').emit('rooms-list', sessionRooms);
            socket.emit('room-created', newRoom.name);
        }
    });

    socket.on('clear-room', (roomId) => {
        console.log('clear-room: ', roomId);
        const room = getRoom(roomId);
        if (room == null) {
            return;
        }
        room.users.forEach(elem => {
            elem.vote = '?';
            elem.status = '?';
        });
        room.stateRoom = stateRoom.vote;
        io.sockets.in(roomId).emit('updated-room', room);
    });

    socket.on('join-room', (username, roomId) => {
        console.log('User ' + username + ' joined room ' + roomId)

        const room = getRoom(roomId);
        if (room == null) {
            handleNotRoom(socket, roomId);
            return;
        }
        socket.join(roomId);

        // Check if user already exists
        const userId = socket.data?.id;
        if (room.users.find(elem => elem.id === userId)) {
            socket.emit('user-joined', socket.data, room);
            return;
        }

        createUser(socket, username);
        room.users.push(socket.data);

        const tmpRoom = createRoomCopy(room);

        // for everyone in the room except the user who joined
        socket.to(roomId).emit('user-joined-room', { room: tmpRoom });
        
        //for the user who joined
        socket.emit('user-joined', { user: socket.data, room: tmpRoom });

        socket.broadcast.to('general').emit('rooms-list', sessionRooms);
    });

    socket.on('voted', (roomId, vote) => {

        if (socket.data.id == null) {
            socket.emit('user-not-found');
            return;
        }

        if (roomId == null || vote == null) {
            return;
        }
        const room = getRoom(roomId);
        if (room == null) {
            console.log('Room not found');
            socket.emit('room-not-found', roomId);
        }

        room.users.find(user => user.id === socket.data.id).vote = vote;
        
        // create data to send to the client
        const tmpRoom = createRoomCopy(room);
        
        
        // for everyone in the room except the user who voted
        socket.to(roomId).emit('other-user-voted', tmpRoom);
        
        tmpRoom.users.find(elem => elem.id === socket.data.id).vote = vote;
        
        // just for the user who voted
        socket.emit('user-voted', tmpRoom );
    });

    socket.on('show-results', (roomId) => {
        const room = getRoom(roomId);
        if (room == null) {
            console.log('Room not found');
            socket.emit('room-not-found', socket.data.roomId);
        }
        room.stateRoom = stateRoom.result;
        io.sockets.in(roomId).emit('navigate-results', room);
    });

    socket.on('ask-results', (roomId) => {
        if (roomId == null) {
            return;
        }
        const room = getRoom(roomId);
        if (room == null) {
            console.log('Room not found');
            socket.emit('room-not-found', roomId);
        }

        const values = new Map();
        let total = 0;
        let userVotedCount = 0;

        room.users.forEach(elem => {
            if (values.has(elem.vote)) {
                values.set(elem.vote, values.get(elem.vote) + 1);
            } else {
                values.set(elem.vote, 1);
            }
            if (elem.vote != '?') {
                total += Number(elem.vote);
                userVotedCount++;
            }
        });

        total = total / userVotedCount;

        const results = [];
        values.forEach((value, key) => {
            results.push({ vote: key, count: value });
        });

        results.forEach(elem => {
            elem.percentage = Math.round((elem.count / room.users.length) * 100);
        });

        results.sort((a, b) => {
            return b.percentage - a.percentage;
        });
        io.sockets.in(roomId).emit('get-results', { room, results, total });
    });

    socket.on('leave-room', (roomId) => {
       leaveRoom(socket, roomId);
    });
});

function handleNotRoom(socket, roomId) {
    console.log('Room not found');
    socket.emit('room-not-found', roomId);
}

function leaveRoom(socket, roomId) {
    if (roomId == null) {
        return;
    }
    const room = getRoom(roomId);
    if (room == null) {
        return;
    }

    const index = room.users.findIndex(elem => elem.id === socket.data.id);
    if (index === -1) {
        return;
    }
    room.users.splice(index, 1);
    socket.broadcast.to('general').emit('rooms-list', sessionRooms);
}

function createRoomCopy(room) {
    const tmpRoom = { ...room };
    tmpRoom.users = [...room.users];
    tmpRoom.users = tmpRoom.users.map(elem => {
        if (elem.vote != '?') {
            return { ...elem, vote: '✔' };
        }
        return elem;
    });
    return tmpRoom;
}

function createUser(socket, username) {
    socket.data.id = socket.data.id ?? uuidv4();
    socket.data.name = username;
    socket.data.vote = '?';
}

function getRoom (roomId) {
    return sessionRooms.find(elem => elem.id === roomId);
}

server.listen(port, () => {
    console.log('Server started on port '  + port);
});