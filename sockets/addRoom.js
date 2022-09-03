const Room = require('../contracts/room');
let { v4: uuidv4 } = require('uuid');

module.exports = function (params) {
    let { io, socket, sessionRooms } = params;
    socket.on('create-room', (room) => {
        if (sessionRooms.find(elem => elem.name === room.name)) {
            console.log('Room already exists: ', room.name);
            socket.emit('room-exists', room);
        } else {
            const newRoom = new Room({ ...room, id: uuidv4(), users: [], owner: socket.data.name, createdAt: Date.now() });
            sessionRooms.push(newRoom);
            io.to('general').emit('rooms-list', sessionRooms);
            socket.emit('room-created', newRoom.name);
            console.log('new room crated: ', newRoom.name);
        }
    });
}