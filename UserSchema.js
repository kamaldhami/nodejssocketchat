const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userSchema = new Schema({
    name: { type: String },
    userid: { type: String}
},
    {
        timestamps: true
    });

let userDetails = mongoose.model("userDetails", userSchema, "UserDetails");

module.exports = userDetails;