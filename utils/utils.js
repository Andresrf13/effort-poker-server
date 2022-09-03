let { v4: uuidv4 } = require('uuid');

const handleNotRoom = function (socket, roomId) {
    console.log(`Room ${roomId} not found` );
    socket.emit('room-not-found', roomId);
}

const leaveRoom = function(socket, roomId, sessionRooms) {
    if (roomId == null) {
        return;
    }
    const room = getRoom(roomId, sessionRooms, socket);
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

const createRoomCopy = function(room) {
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

const createUser = function(socket, username) {
    socket.data.id = socket.data.id ?? uuidv4();
    socket.data.name = username;
    socket.data.vote = '?';
}

const getRoom = function (roomId, sessionRooms, socket) {
    if (sessionRooms == null) {
        handleNotRoom(socket, roomId);
        return;
    }
    return sessionRooms.find(elem => elem.id === roomId);
}

module.exports = {
    getRoom,
    createUser,
    createRoomCopy,
    handleNotRoom,
    leaveRoom
}
