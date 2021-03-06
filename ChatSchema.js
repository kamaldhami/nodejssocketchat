const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const chatSchema = new Schema({
    message: { type: String },
    senderid: { type: String },
    receiverid: { type: String },
    name: { type: String },
    userid: { type: String }
},
    {
        timestamps: true
    });

let Chat = mongoose.model("Chat", chatSchema, "chat");

module.exports = Chat;