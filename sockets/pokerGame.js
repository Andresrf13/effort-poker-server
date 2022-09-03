let { getRoom, handleNotRoom, createUser, createRoomCopy, leaveRoom } = require('../utils/utils');
const stateRoom = require('../contracts/stateRoom');

module.exports = function (params) {
    let { io, socket, sessionRooms } = params;

    socket.on('clear-room', (roomId) => {
        console.log('clear-room: ', roomId);
        const room = getRoom(roomId, sessionRooms, socket);
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
        console.log('User ' + username + ' joined room ' + roomId);

        const room = getRoom(roomId, sessionRooms, socket);
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
        const room = getRoom(roomId, sessionRooms, socket);
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
        socket.emit('user-voted', tmpRoom);
    });

    socket.on('show-results', (roomId) => {
        const room = getRoom(roomId, sessionRooms, socket);
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
        const room = getRoom(roomId, sessionRooms, socket);
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
}