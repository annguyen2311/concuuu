const mongoose = require('mongoose');

let messages = [];
let messageIdCounter = 1;
let messageHistory = [];

const MessageSchema = new mongoose.Schema({
    _id: Number,
    room: String,
    username: String,
    message: String,
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', MessageSchema);

// Override Mongoose methods with in-memory implementation
Message.create = async function(data) {
    const msg = {
        _id: messageIdCounter++,
        ...data,
        createdAt: new Date()
    };
    messages.push(msg);
    return msg;
};

Message.find = async function(query = {}) {
    return messages;
};

Message.countDocuments = async function() {
    return messages.length;
};

module.exports = Message;
