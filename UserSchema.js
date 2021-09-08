const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userSchema = new Schema({
    name: { type: String ,unique : true, required : true, dropDups: true},
    userid: { type: String,unique : true, required : true, dropDups: true}
},
    {
        timestamps: true
    });

let User = mongoose.model("User", userSchema, "user");

module.exports = User;