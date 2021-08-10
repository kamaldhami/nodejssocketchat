const mongoose = require("mongoose");

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

const groupmetadataSchema = new Schema({
    groupid: { type: ObjectId, required: true },
    participant: { type: String, required: true },
    lastseen: { type: Date, default: new Date() }
});

let GroupMetaData = mongoose.model("GroupMetaData", groupmetadataSchema, "group_MetaData");

module.exports = GroupMetaData;