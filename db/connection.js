const mongoose = require('mongoose');
const url = "mongodb+srv://kamaldhami:8954964352@cluster0.296fz.mongodb.net/chat?retryWrites=true&w=majority";

const connectionParams = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
}



mongoose.connect(url, connectionParams)
    .then(() => {
        console.log('Connected to database ')
    })
    .catch((err) => {
        console.error(`Error connecting to the database. \n${err}`);
    })
