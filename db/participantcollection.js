const mongoose = require("mongoose");

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

const participantdataSchema = new Schema({
    groupid: { type: ObjectId, required: true },
    userid: { type: String, required: true },
    name: { type: String, required: true },
    lastseen: { type: Date, default: new Date() },
    groupname: { type: String, required: true }
});

let ParticipantData = mongoose.model("ParticipantData", participantdataSchema, "participantData");

module.exports = ParticipantData;
