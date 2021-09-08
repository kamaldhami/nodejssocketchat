const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const chatgroupSchema = new Schema({
    name: { type: String, required: true },
    count: { type: String, required: true },
    ownerid: { type: String, required: true }
},
    {
        timestamps: true
    });

let GroupChat = mongoose.model("GroupChat", chatgroupSchema, "groupChat");

module.exports = GroupChat;