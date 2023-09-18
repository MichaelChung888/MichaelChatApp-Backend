const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema ({
    data: String,
    name: String,
    type: String
});

const MessageSchema = new mongoose.Schema({
    sender: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    recipient: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    text: String,
    file: FileSchema
}, {timestamps: true});

const MessageModel = mongoose.model("Message", MessageSchema);
module.exports = MessageModel;