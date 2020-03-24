const mongoose = require('mongoose')


let ArticleSchema = new mongoose.Schema({
    title: String,
    content: String,
    author: Object,
    id: String,
    likes: Array,
    collect: Number,
    looks: Number,
    answer: Array,
    create_time: String,
    type: String,
    personal: String  // 原创转载
});

const articleModel = mongoose.model('article', ArticleSchema);



module.exports = {
    articleModel,
};
