require('./db/connection')
const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const port = 8000
var socketIo = require('socket.io')
const Chat = require("./ChatSchema");
const GroupChat = require("./ChatgroupSchema");
const User = require("./UserSchema");
const GroupMetaData = require("./db/Groupmetadata");
// const connect = require("./dbconnection");

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ['GET', 'POST'], credential: true, transports: ["websocket"], upgrade: false } });

const JOIN = "JOIN"
const LEAVE = "LEAVE"
const MESSAGE = "MESSAGE"
const GROUPADD = "GROUPADD"
const ADDPARTICIPANT = "ADDPARTICIPANT"
const REMOVEPARTICIPANT = "REMOVEPARTICIPANT"
const LEAVEGROUP = "LEAVEGROUP"
const GROUPJOIN = "GROUPJOIN"
const NEWADMIN = "NEWADMIN"
const GROUPCREATE = "GROUPCREATE"

var newarray = [];

io.on('connection', async (socket) => {

    const { loginname, loginid } = socket.handshake.query;

    const socketid = socket.id

    newarray.push({ name: loginname, id: socketid, userid: loginid })

    const isUser = User.countDocuments({ userid: loginid })
    if (!isUser) {
        let user = new User({ name: loginname, userid: loginid });
        user.save();
    }
    else {
        let user = new User({ name: loginname, userid: loginid });
        user.save();
    }


    // console.log("Connected : ", socketid)
    // console.log("Array : ", newarray)

    socket.join(loginid)

    io.emit(JOIN, newarray)

    socket.on(GROUPJOIN, (data) => {

        socket.join(data.groupid)
    })

    socket.on(MESSAGE, message => {

        io.to(message.receiverid).emit(MESSAGE, message)
        // io.to(message.senderid).emit(MESSAGE, message)

        var messagebody = message.message
        var receiver = message.receiverid
        var sender = message.senderid


        let chatMessage = new Chat({ message: messagebody, senderid: sender, receiverid: receiver, name: loginname });
        chatMessage.save();
    })

    socket.on("disconnecting", () => {

        console.log("disconnecting")
    })
    socket.on("disconnect", () => {
        const index = newarray.findIndex(ar => ar.id === socket.id)
        newarray.splice(index, 1)
        console.log("Client disconnected", newarray);
        io.emit(LEAVE, { id: socket.id })
    });

    socket.on(GROUPADD, (data) => {

        var namefromdata = data.name
        var participantd = data.participant
        var owner = data.owner
        var sok = participantd.map(function (ds) { return ds.socketid; });


        let groupadd = new GroupChat({ name: namefromdata, participant: participantd, ownerid: owner });
        groupadd.save().then(item => {

            item.participant.forEach(function (element) {
                let metadata = new GroupMetaData({ groupid: item._id, participant: element.socketid })
                metadata.save()
            })

        })


        io.to(sok).emit(GROUPCREATE, data)
    })


    socket.on(ADDPARTICIPANT, (data) => {

        // var participantid = data.participant.socketid
        var participant = data.participant
        var colapse = participant.map(function (ds) { return ds.socketid; });
        // GroupChat.findByIdAndUpdate({ ownerid: data.owner, name: data.name }, function () {

        //     var add = new GroupChat({ participant: participant });
        //     add.save();

        // });

        GroupChat.updateOne({ ownerid: data.owner, name: data.name }, { $push: { participant: participant } }, function (err, updElem) {
            console.log("updElem" + JSON.stringify(updElem));
        });

        io.to(colapse), emit(AFTERADD, data)

    })


    socket.on(REMOVEPARTICIPANT, (data) => {

        var participantd = data.participant
        var naos = participantd.map(function (el) { return el.socketid; });


        GroupChat.updateOne({ ownerid: data.owner, _id: data.id }, { $pull: { participant: { socketid: { $in: naos } } } }, (err, updElem) => {
            if (err) {
                return res.status(500).json({ error: 'error in deleting address' });
            }
            else {
                console.log("updElem" + JSON.stringify(updElem));
            }

            io.emit(REMOVEPARTICIPANT, data)
        });
    })


    socket.on(LEAVEGROUP, (data) => {

        // var picked = GroupChat.find({ ownerid: data.owner });

        GroupChat.countDocuments({ ownerid: data.owner, _id: data.id }, function (err, count) {
            if (count == 0) {
                GroupChat.updateOne({ _id: data.id }, { $pull: { participant: { socketid: data.owner } } }, (err, updElem) => {
                    console.log("updElem" + JSON.stringify(updElem));
                    io.emit(LEAVEGROUP, { false: 'false' })
                })
            }
            else {
                io.emit(LEAVEGROUP, { true: 'true' })

            }

        });

    })

    socket.on(NEWADMIN, (data) => {

        GroupChat.updateOne({ _id: data.id }, { $pull: { participant: { socketid: data.removeid } }, $set: { ownerid: data.ownerid } }, function (err, updElem) {
            console.log("updElem" + JSON.stringify(updElem));
        });

    })

    // socket.on(GROUPLIST, (data) => {
    //     GroupChat.find({ ownerid: data.owner }, (err, data) => {
    //         io.emit(GROUPLIST, data)
    //     })
    // });


})

app.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome" });
});

app.post('/message', function (req, res) {

    Chat.find({ senderid: req.body.senderid, receiverid: req.body.receiverid }, function (err, data) {

        if (err) {
            res.status(401).json({ err });
        }
        else {
            res.status(200).json({ data });
        }
    });

    // explain('queryPlanner')

});

app.post('/groupmessages', function (req, res) {

    Chat.find({ receiverid: req.body.receiverid }, function (err, data) {
        if (err) {
            res.status(401).json({ err });
        }
        else {
            res.status(200).json({ data });
        }
    })
})

app.post('/grouplist', function (req, res) {

    var par = req.body.sok

    GroupChat.find({ "participant.socketid": par }, (err, data) => {
        if (err) {
            res.status(401).json({ err });
        }
        else {
            res.status(200).json({ data });
        }
    });

});



server.listen(port, () => {
    console.log('server is running 8000')
})
