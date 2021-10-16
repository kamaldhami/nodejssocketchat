const mongoose = require("mongoose");
const  url  =  "mongodb://localhost:27017/socketchat";
const  connect  =  mongoose.connect(url, { useNewUrlParser: true });
module.exports  =  connect;