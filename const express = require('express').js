const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const port = 5000;
const User = require('./registerSchema');
const userDetails = require('./UserSchema');
const Chat = require('./ChatSchema')
const GroupChat = require("./ChatgroupSchema");
const ParticipantData = require("./participantcollection");
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
var socketIo = require('socket.io')
const { v4: uuidv4 } = require('uuid');
const { msg91OTP } = require('msg91-lib');


require("./dbconnection")

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
const ONETOONE = "ONETOONE"
const LEAVE = "LEAVE"
const NOTIFY = "NOTIFY"
const UNREADMSG = "UNREADMSG"
const REFRESH = "REFRESH"
const LOGIN = "LOGIN"

var newarray = [];


app.post('/registeruser', async function (req, res) {

    const msg91otp = new msg91OTP({ authKey: '366533Ak8tfnNw612e0196P1', templateId: '615d3a012df5dc3c7f7dfb7a' });

    var newemail;
    var newmobile;
    var email = req.body.emailmobile
    var foremail = email.includes("@");
    if (foremail == true) {
        newemail = email
    }
    else {
        newmobile = '91' + email

        const response = await msg91otp.send(newmobile);

    }

    var emailotp = otpGenerator.generate(6, { upperCase: false, specialChars: false })

    if (newemail) {
        var user = User({
            username: req.body.username,
            useremail: newemail,
            otp: emailotp,
            uuid: uuidv4()
        })
    }

    else {
        var user = User({
            username: req.body.username,
            mobileno: newmobile,
            uuid: uuidv4()
        })
    }


    user.save().then(data => {

        if (data.useremail) {

            let mailTransporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'dtechextechnologies@gmail.com',
                    pass: 'D#tech123##'
                }
            });


            let mailDetails = {
                from: 'dtechextechnologies@gmail.com',
                to: data.useremail,
                subject: 'OTP',
                text: emailotp
            };

            mailTransporter.sendMail(mailDetails, function (err) {
                if (err) {
                    res.status(401).json(err);
                } else {
                    res.status(200).json({ data });
                }
            });

        }
        else {
            res.status(200).json({ data })
        }

    });

});

app.post('/email', (req, res) => {
    let mailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'kdhami159@gmail.com',
            pass: '8954964352'
        }, tls: {
            rejectUnauthorized: false
        }
    });

    let mailDetails = {
        from: 'kdhami159@gmail.com',
        to: 'kamaldhami741@gmail.com',
        subject: 'Test mail',
        text: 'testing mail'
    };

    mailTransporter.sendMail(mailDetails, function (err, data) {
        if (err) {
            res.status(401).json(err);
        } else {
            res.status(200).json('Email sent successfully');
        }
    });
})

app.post('/otpverify', async (req, res) => {

    const msg91otp = new msg91OTP({ authKey: '366533Ak8tfnNw612e0196P1', templateId: '615d3a012df5dc3c7f7dfb7a' });


    var email = req.body.mobile
    var foremail = email.includes("@");
    if (foremail == true) {
        var count = await User.countDocuments({ otp: req.body.otp })
        if (count == 1) {
            res.status(200).json({ message: 'User Verified' })
        }
        else {
            res.status(401).json({ message: 'User Not Verified' })
        }

    }
    else {
        let mobileno = '91' + email
        const response = await msg91otp.verify(mobileno, req.body.otp)

        if (response.message == 'OTP verified success') {
            res.status(200).json({
                message: 'User Verified'
            })
        }
        else {
            res.status(401).json({ message: 'User Not Verified' })
        }


    }






});


io.on('connection', async (socket) => {


    const { loginname, loginid } = socket.handshake.query;
    const socketid = socket.id

    socket.emit(LOGIN, { login: loginid })


    socket.on(REFRESH, (roo) => {

        socket.join(roo)

    })


    newarray.push({ name: loginname, id: socketid, userid: loginid })

    await userDetails.updateOne({ userid: loginid }, { $set: { name: loginname } }, { upsert: true });

    io.emit(JOIN, newarray)

    socket.on(ONETOONE, async (data) => {

        socket.join(data.channel)
        let wait = await GroupChat.updateOne({ channel: data.channel }, { $set: { name: data.name, count: data.count } }, { upsert: true })
        let count = await ParticipantData.countDocuments({ channel: data.channel })
        if (count == 0) {
            data.participant.forEach((element) => {
                let metadata = new ParticipantData({ userid: element.userid, name: element.name, groupname: element.group, channel: data.channel, type: 'private' })
                metadata.save()
            })
        }

    })

    socket.on(GROUPJOIN, (data) => {

        socket.join(data.groupid)
        socket.leave('notify_' + data.groupid)
        socket.group = data.groupid
        ParticipantData.updateOne({ "groupid": data.groupid, "userid": loginid }, { "$set": { "lastseen": new Date() } }, (err, updElem) => {
            if (err) {
                return ({ error: 'error' });
            }
            else {
                console.log("updElem" + JSON.stringify(updElem));
            }
        });

    })

    socket.on(LEAVEID, (data) => {
        socket.join('notify_' + data.groupid)
        socket.leave(data.groupid)

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

        io.emit(MESSAGE, message)

        //  io.to(message.receiverid).emit(MESSAGE, message)
        // io.to('notify_' + message.receiverid).emit(UNREADMSG, message)

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

    });

    socket.on(GROUPADD, (data) => {

        var namefromdata = data.name
        var participantd = data.participant
        var owner = data.owner
        var sok = participantd.map((ds) => { return ds.socketid });

        let groupadd = new GroupChat({ name: namefromdata, count: participantd.length, ownerid: owner });
        groupadd.save().then(item => {

            var noti = {
                type: 'groupcreate',
                channel: item._id
            }

            io.to(sok).emit(NOTIFY, noti)

            participantd.forEach(function (element) {
                let metadata = new ParticipantData({ channel: item._id, userid: element.socketid, name: element.username, groupname: item.name, type: 'public' })
                metadata.save()
            })

        })

    })

    socket.on(ADDPARTICIPANT, (data) => {

        var participant = data.participant
        var brod = participant.map((ds) => { return ds.socketid });

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

    })

    socket.on(REMOVEPARTICIPANT, (data) => {

        var participantd = data.participant
        var naos = participantd.map(function (el) { return el.socketid; });

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

        GroupChat.countDocuments({ ownerid: data.owner, _id: data.id }, function (err, count) {
            if (count == 0) {
                ParticipantData.remove({ groupid: data.id, userid: data.owner }, (err, updElem) => {

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

            ParticipantData.remove({ groupid: data.id, userid: data.removeid }, (err, result) => {

                var noti = {
                    type: 'adminleave',
                    groupid: data.removeid
                }
                io.to(data.removeid).emit(NOTIFY, noti)
            });
        });


    })

})


app.post('/privategroup', async (req, res) => {

    await Chat.find({ receiverid: req.body.channel }, (err, data) => {

        if (err) {
            res.status(401).json({ err });
        }
        else {
            res.status(200).json({ data });
        }
    }).clone().catch(function (err) { console.log(err) })

})

// app.post('/message', function (req, res) {

//     Chat.find({ senderid: req.body.senderid, receiverid: req.body.receiverid }, function (err, data) {

//         if (err) {
//             res.status(401).json({ err });
//         }
//         else {
//             res.status(200).json({ data });
//         }
//     });

// });

app.post('/groupmessages', function (req, res) {

    Chat.find({ receiverid: req.body.receiverid }, function (err, data) {
        if (err) {
            res.status(401).json({ err });
        }
        else {
            res.status(200).json({ data });
        }
    }).clone().catch(function (err) { console.log(err) })
})

app.post('/grouplist', async function (req, res) {

    const getData = await ParticipantData.find({ userid: req.body.sok });

        var sdata;
        var arr = [];

        for (var i = 0; i < getData.length; i++) {

            let items = getData[i]

            var count = await Chat.countDocuments({ receiverid: items.channel, "createdAt": { $gt: items.lastseen } })

            sdata = JSON.parse(JSON.stringify(items));
            sdata.unreadcount = count;
            arr.push(sdata);
        }
        

        res.status(200).json({ arr });

});

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

            userDetails.find({}, (err, udata) => {
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

            res.json({ err })
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

    if (req.body.type == 'public') {
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

    }

    if (req.body.type == 'private') {
        const getData = await ParticipantData.find({ channel: req.body.groupid, userid: req.body.userid });

        var sdata;
        var arr = [];

        for (var i = 0; i < getData.length; i++) {

            let items = getData[i]

            var count = await Chat.countDocuments({ receiverid: items.channel, "createdAt": { $gt: items.lastseen } })


            sdata = JSON.parse(JSON.stringify(items));
            sdata.unreadcount = count;
            arr.push(sdata);


        }

        res.status(200).json({ arr });

    }

});

app.post('/deletegroup', async (req, res) => {

    const data = await GroupChat.deleteOne({ _id: req.body.groupid });
    const dele = await ParticipantData.deleteOne({ groupid: req.body.groupid })


})

app.post('/messagePagination', async (req, res) => {

    let { page, size } = req.body;
    if (!page) {
        page = 1;
    }
    if (!size) {
        size = 5;
    }

    const limit = parseInt(size);
    const skip = (page - 1) * size;

    var data = await Chat.find({ receiverid: req.body.receiverid }).limit(limit).skip(skip);

    res.status(200).json({
        data
    })

})


app.listen(port, () => {
    console.log('server is running 5000')
})