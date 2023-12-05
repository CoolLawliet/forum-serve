const express = require('express')
const router = express.Router();
const postParams = require('../../utils/postParams')
const {userModel} = require('../../models/users')
const {articleModel} = require('../../models/articles')
const {mySend, myError} = require('../../utils/send')


// 发帖子接口
router.post('/sendArticle', (req, res) => {
    const {title, content, author, type, personal, looks} = req.app.get('params');
    articleModel.create({
        title,
        content,
        likes: [],
        answer: [],
        collect: 0,
        id: req.app.get('_id'),
        create_time: new Date().getTime(),
        author: JSON.parse(author),
        type,
        personal,
        looks
    }, err => {
        if (err) {
            myError(res, err)
            return
        }
        mySend(res, {msg: '发贴成功'})
    })
})

// 获取帖子
router.get('/', (req, res) => {
    const {pageIndex, type} = req.query;
    if (type) {
        articleModel.countDocuments({}, (err, count) => {
            if (err) {
                myError(res, err)
                return
            }
            articleModel.find({type})
                .skip(5 * ((pageIndex ? pageIndex : 1) - 1))
                .sort({'_id': -1})
                .limit(5)
                .exec((err, msg) => {
                    if (err) {
                        myError(res, err)
                        return
                    }
                    mySend(res, {msg: '获取成功', data: msg, total: count})
                })
        })
    } else {
        articleModel.countDocuments({}, (err, count) => {
            if (err) {
                myError(res, err)
                return
            }
            articleModel.find({})
                .skip(5 * ((pageIndex ? pageIndex : 1) - 1))
                .sort({'_id': -1})
                .limit(5)
                .exec((err, msg) => {
                    if (err) {
                        myError(res, err)
                        return
                    }
                    mySend(res, {msg: '获取成功', data: msg, total: count})
                })
        })
    }
})

// 点赞帖子
router.get('/like', (req, res) => {
    const {id, is_like} = req.query
    const userId = req.app.get('_id')
    if (String(is_like) == 'true') {
        const promise_one = new Promise((resolve, reject) => {
            articleModel.updateOne({_id: id}, {
                    $push: {
                        likes: userId
                    },
                    $inc: {collect: 1}
                },
                (err, meg) => {
                    if (err) {
                        reject(err)
                    }
                    resolve()
                    // mySend(res, { msg: '点赞成功' })
                })
        })
        const promise_two = new Promise((resolve, reject) => {
            articleModel.findOne({_id: id}, (err, msg) => {
                if (err) {
                    reject(err)
                }
                userModel.updateOne({_id: msg.id}, {
                        $inc: {like: 1}
                    },
                    (err, meg) => {
                        if (err) {
                            reject(err)
                        }
                        resolve()
                    })
            })

        })
        Promise.all([promise_one, promise_two]).then(() => {
            mySend(res, {msg: '点赞成功'})
        }).catch(err => {
            myError(res, err)
        })
    } else {
        const promise_one = new Promise((resolve, reject) => {
            articleModel.updateOne({_id: id}, {
                    $pull: {
                        likes: userId
                    },
                    $inc: {collect: -1}
                },
                (err, meg) => {
                    if (err) {
                        reject(err)
                    }
                    resolve()
                    // mySend(res, { msg: '点赞成功' })
                })
        })
        const promise_two = new Promise((resolve, reject) => {
            articleModel.findOne({_id: id}, (err, msg) => {
                if (err) {
                    reject(err)
                }
                userModel.updateOne({_id: msg.id}, {
                        $inc: {like: -1}
                    },
                    (err, meg) => {
                        if (err) {
                            reject(err)
                        }
                        resolve()
                    })
            })
        })
        Promise.all([promise_one, promise_two]).then(() => {
            mySend(res, {msg: '取消点赞成功'})
        }).catch(err => {
            myError(res, err)
        })
    }
})

// 获取帖子排行
router.get('/sort', (req, res) => {
    articleModel.find({}).sort({'looks': -1}).limit(9).exec((err, msg) => {
        if (err) {
            myError(res, err)
            return
        }
        mySend(res, {msg: '获取成功', data: msg})
    })
})

// 获取帖子分类数量
router.get('/typeNum', (req, res) => {
    // const type = req.query.type
    // console.log(type);
    let typeList = [];
    articleModel.aggregate(
        [
            {
                $group:
                    {
                        _id: {"type": "$type"},
                        count: {$sum: 1},
                        // total:{$sum: }
                    },
            },
            {
                $sort: {
                    count: -1
                }
            }
        ]
    ).exec((err, data) => {
        if (err) {
            myError(res, err)
        }
        typeList.push(data);
        articleModel.countDocuments({}, (err, count) => {
            if (err) {
                myError(res, err);
                return
            }
            typeList[0].unshift({
                "_id": {
                    type: "全部"
                },
                "count": count
            });
            mySend(res, {data: typeList})
        })

    })


})

// 获取帖子详情
router.get('/detail', (req, res) => {
    const {_id} = req.query;
    const promise_one = new Promise((resolve, reject) => {
        articleModel.findOne({_id}, (err, msgD) => {
            if (err) {
                reject(err)
            }
            userModel.updateOne({_id: msgD.id}, {
                $inc: {looks: 1}
            }, (err, msg) => {
                if (err) {
                    reject(err)
                }
                resolve(msgD)
            });
        });
    })
    const promise_two = new Promise((resolve, reject) => {
        articleModel.updateOne({_id}, {
            $inc: {looks: 1}
        }, (err, msg) => {
            if (err) {
                reject(err)
            }
            resolve()
        })
    })
    Promise.all([promise_one, promise_two]).then((sres) => {
        mySend(res, {msg: '获取成功', data: sres[0]})
    }).catch(err => {
        myError(res, err)
    })
})

// 回复帖子
router.get('/reply', (req, res) => {
    const {_id, content} = req.query;
    articleModel.updateOne({_id}, {
        '$push': {
            answer: {
                user_info: req.app.get('userInfo'),
                content,
                time: new Date().getTime()
            }
        }
    }, (err, msg) => {
        if (err) {
            myError(res, err)
            return
        }
        mySend(res, {msg: '评论成功'})
    });
})

module.exports = router
