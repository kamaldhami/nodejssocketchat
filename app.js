// require('./db/connection')
const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const port = 8000;
var socketIo = require('socket.io')
const Chat = require("./ChatSchema");
const GroupChat = require("./ChatgroupSchema");
const User = require("./UserSchema");
const ParticipantData = require("./db/participantcollection");
require("./dbconnection");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ['GET', 'POST'], credential: true, transports: ["websocket"], upgrade: false } });

const JOIN = "JOIN"
const LEAVEID = "LEAVEID"
const MESSAGE = "MESSAGE"
const GROUPADD = "GROUPADD"
const ADDPARTICIPANT = "ADDPARTICIPANT"
const REMOVEPARTICIPANT = "REMOVEPARTICIPANT"
const LEAVEGROUP = "LEAVEGROUP"
const GROUPJOIN = "GROUPJOIN"
const NEWADMIN = "NEWADMIN"
const GROUPCREATE = "GROUPCREATE"
const LEAVE = "LEAVE"
const NOTIFY = "NOTIFY"
const UNREADMSG = "UNREADMSG"
const REFRESH = "REFRESH"
const LOGIN = "LOGIN"

var newarray = [];

io.on('connection', async (socket) => {

    const { loginname, loginid } = socket.handshake.query;

    const socketid = socket.id

    socket.emit(LOGIN, { login: loginid })


    socket.on(REFRESH, (roo) => {

        socket.join(roo)
        console.log(socket.rooms)

        // var str = roo
        // var s = str.slice(7)

    })


    newarray.push({ name: loginname, id: socketid, userid: loginid })


    const isUser = User.countDocuments({ userid: loginid })

    // if (!isUser) {
    //     let user = new User({ name: loginname, userid: loginid });
    //     user.save();
    // }

    let user = new User({ name: loginname, userid: loginid });
    user.save();


    // console.log("Connected : ", socketid)
    // console.log("Array : ", newarray)

    socket.join(loginid)

    io.emit(JOIN, newarray)

    socket.on(GROUPJOIN, (data) => {

        socket.join(data.groupid)
        socket.leave('notify_' + data.groupid)
        socket.group = data.groupid
        ParticipantData.updateOne({ "groupid": data.groupid, "userid": loginid }, { "$set": { "lastseen": new Date() } }, (err, updElem) => {
            if (err) {
                return ({ error: 'error in deleting address' });
            }
            else {
                console.log("updElem" + JSON.stringify(updElem));
            }
        });

    })

    socket.on(LEAVEID, (data) => {
        socket.join('notify_' + data.groupid)
        socket.leave(data.groupid)
        console.log(socket.rooms)
        ParticipantData.updateOne({ "groupid": data.groupid, "userid": data.loginid }, { "$set": { "lastseen": new Date() } }, (err, updElem) => {
            if (err) {
                return ({ error: 'error in deleting address' });
            }
            else {
                console.log("updElem" + JSON.stringify(updElem));
            }
        });
    })

    socket.on(MESSAGE, message => {

        io.to(message.receiverid).emit(MESSAGE, message)
        // io.to(message.senderid).emit(MESSAGE, message)

        io.to('notify_' + message.receiverid).emit(UNREADMSG, message)

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
        // console.log("Client disconnected", newarray);

        ParticipantData.updateOne({ "groupid": socket.group, "userid": loginid }, { "$set": { "lastseen": new Date() } }, (err, updElem) => {
            if (err) {
                return ({ error: 'error in deleting address' });
            }
            else {
                console.log("updElem" + JSON.stringify(updElem));
            }
        });


        io.emit(LEAVE, { id: socket.id })
    });

    socket.on(NOTIFY, (room) => {

        socket.join(room);
        socket.dummygroup = room

        console.log(socket.rooms)
    });

    socket.on(GROUPADD, (data) => {

        var namefromdata = data.name
        var participantd = data.participant
        var owner = data.owner
        var sok = participantd.map((ds) => { return ds.socketid });

        // const index = sok.findIndex(ar => ar === owner)
        // sok.splice(index, 1)


        let groupadd = new GroupChat({ name: namefromdata, count: participantd.length, ownerid: owner });
        groupadd.save().then(item => {


            var noti = {
                type: 'groupcreate',
                channel: item._id
            }

            io.to(sok).emit(NOTIFY, noti)


            participantd.forEach(function (element) {
                let metadata = new ParticipantData({ groupid: item._id, userid: element.socketid, name: element.username, groupname: item.name })
                metadata.save()
            })

        })


        // io.to(sok).emit(GROUPCREATE, data)
    })


    socket.on(ADDPARTICIPANT, (data) => {

        // var participantid = data.participant.socketid
        var participant = data.participant

        var brod = participant.map((ds) => { return ds.socketid });

        // var colapse = participant.map(function (ds) { return ds.socketid; });
        // GroupChat.findByIdAndUpdate({ ownerid: data.owner, name: data.name }, function () {

        //     var add = new GroupChat({ participant: participant });
        //     add.save();

        // });



        GroupChat.countDocuments({ _id: data.groupid, ownerid: data.owner, name: data.name }, function (err, count) {

            if (count > 0) {

                participant.forEach(function (element) {
                    let metadata = new ParticipantData({ groupid: data.groupid, userid: element.socketid, name: element.username, groupname: data.name })
                    metadata.save()
                })

                var noti = {
                    type: 'moreparticipant',
                    channel: data.groupid
                }

                io.to(brod).emit(NOTIFY, noti)

            }
        });



        //  io.to(colapse), emit(AFTERADD, data)

    })


    socket.on(REMOVEPARTICIPANT, (data) => {

        var participantd = data.participant
        var naos = participantd.map(function (el) { return el.socketid; });

        // GroupChat.updateOne({ ownerid: data.owner, _id: data.id }, { $pull: { participant: { socketid: { $in: naos } } } }, (err, updElem) => {
        //     if (err) {
        //         return res.status(500).json({ error: 'error in deleting address' });
        //     }
        //     else {
        //         console.log("updElem" + JSON.stringify(updElem));
        //     }

        //     io.emit(REMOVEPARTICIPANT, data)
        // });

        if (data.participant.length > 0) {

            GroupChat.countDocuments({ ownerid: data.owner, _id: data.id }, function (err, count) {

                if (count > 0) {
                    ParticipantData.remove({ groupid: data.id, userid: { $in: naos } }, (err, result) => {

                        var noti = {
                            type: 'removeparticipant',
                            channel: data.groupid,
                            user: naos,
                            groupname: data.name

                        }

                        io.to(naos).emit(NOTIFY, noti)

                    });
                }
            });
        }


    })


    socket.on(LEAVEGROUP, (data) => {


        // var picked = GroupChat.find({ ownerid: data.owner });

        GroupChat.countDocuments({ ownerid: data.owner, _id: data.id }, function (err, count) {
            if (count == 0) {
                ParticipantData.remove({ groupid: data.id, userid: data.owner }, (err, updElem) => {
                    // console.log("updElem" + JSON.stringify(updElem));
                    io.emit(LEAVEGROUP, { false: 'false' })
                    var noti = {
                        type: 'leave',
                        groupid: data.id
                    }
                    socket.leave('notify_' + data.id)
                    io.to(data.owner).emit(NOTIFY, noti)
                })


            }
            if (count > 0) {
                io.emit(LEAVEGROUP, { true: 'true' })

            }

        });

    })

    socket.on(NEWADMIN, (data) => {

        GroupChat.updateOne({ _id: data.id }, { $set: { ownerid: data.ownerid } }, function (err, updElem) {
            console.log("updElem" + JSON.stringify(updElem));

            ParticipantData.remove({ groupid: data.id, userid: data.removeid }, (err, result) => {

                var noti = {
                    type: 'adminleave',
                    groupid: data.removeid
                }

                io.to(data.removeid).emit(NOTIFY, noti)

            });

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

app.post('/grouplist', async function (req, res) {

    const getData = await ParticipantData.find({ "userid": req.body.sok });


    var sdata;
    var arr = [];

    for (var i = 0; i < getData.length; i++) {

        let items = getData[i]

        var count = await Chat.countDocuments({ receiverid: items.groupid, "createdAt": { $gt: items.lastseen } })


        sdata = JSON.parse(JSON.stringify(items));
        sdata.unreadcount = count;
        arr.push(sdata);


    }

    res.status(200).json({ arr });
});

// app.post('/allparticipant', function (req, res) {

//     var gid = req.body.groupid

//     var result = []
//     ParticipantData.find({ "groupid": gid }, (err, pdata) => {
//         if (err) {
//             res.status(401).json({ err });
//         }
//         else {
//             GroupChat.find({ "_id": gid }, function (err, gdata) {
//                 if (err) {
//                     res.status(401).json({ err });
//                 } else {

//                     ress = JSON.parse(JSON.stringify(gdata[0]));

//                     ress.participantdata = pdata;
//                     result.push(ress)
//                     res.status(200).json({
//                         result
//                     });
//                 }
//             });
//         }
//     });


// });

app.post('/removeandmakeadmin', function (req, res) {
    ParticipantData.find({ groupid: req.body.groupid }, (err, data) => {
        if (err) {
            res.status(401).json({ err });
        }
        else {
            res.status(200).json({ data })
        }
    });
});

app.post('/addparticipant', function (req, res) {

    ParticipantData.find({ groupid: req.body.groupid }, (err, data) => {

        if (err) {
            res.status(401).json({ err });
        }
        else {


            User.find({}, (err, udata) => {
                if (err) {
                    res.status(401).json({ err });
                }
                else {

                    const len = udata.length;
                    let i = 0;
                    const arr = []
                    while (i < len) {
                        let index = data.findIndex(data => data.userid === udata[i].userid)

                        if (index == -1) {

                            arr.push(udata[i])

                        }

                        i++;
                    }


                    res.status(200).json({ arr });
                }
            })

        }
    });
});

app.post('/updatemeta', function (req, res) {
    GroupChat.updateOne({ "_id": "61161afecd705d28a0f2aeb2", "participant.socketid": 'id' }, { "$set": { "participant.$.lastseen": new Date() } }, function (err, data) {

        if (err) {
            console.log(err)
        }
        else {
            res.json({ data })
        }

    });
})


app.post('/groupowner', function (req, res) {
    GroupChat.find({ _id: req.body.groupid }, (err, data) => {

        if (err) {
            res.status(401).json({ err })
        }
        else {
            res.status(200).json({ data })
        }
    });
})

app.post('/partbygroupid', async (req, res) => {
    const getData = await ParticipantData.find({ groupid: req.body.groupid, userid: req.body.userid });

    var sdata;
    var arr = [];

    for (var i = 0; i < getData.length; i++) {

        let items = getData[i]

        var count = await Chat.countDocuments({ receiverid: items.groupid, "createdAt": { $gt: items.lastseen } })


        sdata = JSON.parse(JSON.stringify(items));
        sdata.unreadcount = count;
        arr.push(sdata);


    }

    res.status(200).json({ arr });


});

app.post('/deletegroup', async (req, res) => {

    const data = await GroupChat.deleteOne({ _id: req.body.groupid });
    const dele = await ParticipantData.deleteOne({ groupid: req.body.groupid })


})


server.listen(port, () => {
    console.log('server is running 8000')
})
