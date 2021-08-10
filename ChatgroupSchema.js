const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const chatgroupSchema = new Schema({
    name: { type: String },
    participant: { type : Array },
    ownerid: {type:String}
},
    {
        timestamps: true
    });

let GroupChat = mongoose.model("GroupChat", chatgroupSchema,"groupChat");

module.exports = GroupChat;