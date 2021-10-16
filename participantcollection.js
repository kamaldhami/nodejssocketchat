const mongoose = require("mongoose");

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

const participantdataSchema = new Schema({
    groupid: { type: ObjectId },
    userid: { type: String },
    name: { type: String },
    lastseen: { type: Date, default: new Date() },
    groupname: { type: String, required: true },
    channel: { type: String },
    type: { type: String }
});

let ParticipantData = mongoose.model("ParticipantData", participantdataSchema, "participantData");

module.exports = ParticipantData;
