const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const registerSchema = new Schema({
    username: { type: String, required: true },
    useremail: { type: String },
    mobileno: { type: Number },
    otp: { type: String },
    uuid: { type: String }
});

let User = mongoose.model("User", registerSchema, "user");

module.exports = User;