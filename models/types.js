const mongoose = require('mongoose')

let  typeSchema = new mongoose.Schema({
    type:String
});

module.exports=mongoose.model('type', typeSchema);

