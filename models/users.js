const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');

let UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    sex: String,
    label: String,
    tips: String,
    like: {
        type: Number,
        default: 0
    },
    looks: {
        type: Number,
        default: 0
    },
    avatar: {
        type: String,
        default: ''
    },
    password: {
        type: String,
        set(val) {
            return bcrypt.hashSync(val,12);
        }
    },
    date: String,
    message: Array
});

const userModel = mongoose.model('user', UserSchema);

module.exports = {
    userModel,
};
