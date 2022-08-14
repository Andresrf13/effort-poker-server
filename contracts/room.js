const EstimationMethod = require('./estimationMethods');
const stateRoom = require('./stateRoom');

class Room {
    constructor(room) {
        this.id = room.id ?? '';
        this.name = room.name ?? '';
        this.description = room.description ?? '';
        this.createdAt = room.createdAt ?? '';
        this.updatedAt = room.updatedAt ?? '';
        this.users = room.users ?? [];
        this.owner = room.owner ?? '';
        this.estimationMethod = room.estimationMethod ?? EstimationMethod.fibonacci;
        this.stateRoom = room.state ?? stateRoom.vote;
    }
}

module.exports = Room;