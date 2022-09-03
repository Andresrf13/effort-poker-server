let express = require('express');
let app = express();

let http = require('http');
let server = http.Server(app);

let socketIO = require('socket.io');
let io = socketIO(server);

let {v4: uuidv4} = require('uuid');
const EstimationMethod = require('./contracts/estimationMethods');
const Room = require('./contracts/room');


const port = process.env.PORT || 3000;

//------- Sessions -------//
const sessionRooms = [];

const session1 = new Room({ id: 'Silvally', name: 'Silvally', estimationMethod: EstimationMethod.fibonacci, description: 'Testing room 1', users: [], createdBy: '', createdAt: Date.now() });
const session2 = new Room({ id: 'FE', name: 'FrontEnd', estimationMethod: EstimationMethod.fibonacci, description: 'Testing room 1', users: [], createdBy: '', createdAt: Date.now() });
const session3 = new Room({ id: 'BE', name: 'BackEnd', estimationMethod: EstimationMethod.numericSequence, description: 'Testing room 1', users: [], createdBy: '', createdAt: Date.now() });

sessionRooms.push(session1);
sessionRooms.push(session2);
sessionRooms.push(session3);

io.on('connection', (socket) => {
    console.log('New user connected');
    let args = { io, socket, sessionRooms };
    
    require('./sockets/home')(args);
    require('./sockets/general')(args);
    require('./sockets/addRoom')(args);
    require('./sockets/pokerGame')(args);
});



server.listen(port, () => {
    console.log('Server started on port '  + port);
});