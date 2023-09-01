const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: {type: String, unique:true},
    password: String
}, {timestamps: true});

//username and passwords are both strings
//username must be unique in the database
//each created user will come with a timestamp to when it was created as a 2nd parameter

const UserModel = mongoose.model("User", UserSchema); //.model() takes 2 parameters, 1)The name of collection 2)The schema
module.exports = UserModel;