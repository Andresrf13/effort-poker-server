module.exports = function (params) {
    let { io, socket, sessionRooms } = params;
    socket.on('join', () => {
        console.log('socket joined to general');
        socket.join('general');
        socket.emit('rooms-list', sessionRooms);
    });
}