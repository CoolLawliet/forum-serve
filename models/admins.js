const mongoose = require('mongoose')

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    des: {
        type: String
    },
    pwd: {
        type: String,
        default: '123456'
    },
    role: {
        type: String
    },
    key: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    autoLogin: {
        type: Boolean
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = Admin = mongoose.model('admins', adminSchema);

