let { createRoomCopy } = require('../utils/utils');
const stateRoom = require('../contracts/stateRoom');

module.exports = function (params) {
    let { io, socket, sessionRooms } = params;
    socket.on("disconnect", (reason) => {

        console.log('user disconnected because: ', reason);

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
}