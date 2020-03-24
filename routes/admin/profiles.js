const express = require('express');
const router = express.Router();
const passport = require('passport');
const mongoose = require('mongoose');

const Type = require('../../models/types');
const {articleModel} = require('../../models/articles');
const {mySend, myError} = require('../../utils/send')

//获取类型
router.get('/getType', (req, res) => {
    // passport.authenticate('jwt', {session: false}),
    Type.find({}, (err, doc) => {
        if (err) {
            myError(res, err);
            return
        }
        // console.log(doc[0]);
        mySend(res, {msg: "获取成功", data: doc})
    })
});
//添加类型
router.post('/addType',
    passport.authenticate('jwt', {session: false}),
    (req, res) => {
        const params = req.app.get('params');
        const type = params.type
        new Type({type}).save().then(types=>{
            res.json({
                state: 'suc',
                msg: '添加成功',
                data: types
            });
        })
    });
//编辑类型
router.post('/editType',
    passport.authenticate('jwt', {session: false}),
    (req, res) => {
        const params = req.app.get('params');
        const _id = params._id;
        Type.updateOne({_id}, {
            '$set': {
                'type': params.type,
            }
        }, (err, msg) => {
            if (err) {
                myError(res, err)
                return
            }
            mySend(res, {msg: '修改成功'})
        })
    }
)
//删除类型
router.post('/delType',
    passport.authenticate('jwt', {session: false}),
    (req, res) => {
        const params = req.app.get('params');
        const _id = params.id;
        Type.findByIdAndDelete({_id}, (err, msg) => {
            if (err) {
                myError(res, err)
            } else {
                mySend(res, {msg: '删除成功'})
            }
        })
    });

//获取帖子
router.get('/getPosts',
    passport.authenticate('jwt', {session: false}),
    (req, res) => {
        let page = parseInt(req.query.page);
        let size = parseInt(req.query.size);
        // console.log(req.query);
        articleModel.countDocuments({}, (err, count) => {
            if (err) {
                myError(res, err);
                return
            }
            articleModel.find({})
                .skip(size * ((page ? page : 1) - 1))
                .sort({'create_time': -1})
                .limit(size)
                .exec((err, msg) => {
                    if (err) {
                        myError(res, err)
                        return
                    }
                    mySend(res, {
                        msg: '获取成功', data: {
                            total: count,
                            list: msg
                        }
                    })
                })
        })
    });
//删除帖子
router.post('/delPost',
    passport.authenticate('jwt', {session: false}),
    (req, res) => {
        const params = req.app.get('params');
        const _id = params.id;
        articleModel.findByIdAndDelete({_id}, (err, msg) => {
            if (err) {
                myError(res, err)
            } else {
                mySend(res, {msg: '删除成功'})
            }
        })
    });
//搜索帖子
router.get('/searchPost',
    // passport.authenticate('jwt', {session: false}),
    (req, res) => {
        let kw = req.query.kw;
        let datas = [];
        articleModel.find().then(posts => {
            if (!posts) {
                return res.status(404).json('没有任何论坛');
            }
            posts.forEach(post => {
                if (post.title.indexOf(kw) !== -1) datas.push(post);
            });
            let page = parseInt(req.query.page);
            let size = parseInt(req.query.size);
            let index = size * (page - 1);
            let newDatas = [];
            for (let i = index; i < size * page; i++) {
                if (datas[i] != null) {
                    newDatas.unshift(datas[i]);
                }
            }
            res.status(200).json({
                state: 'suc',
                msg: '成功加载更多周报数据',
                data: {
                    total: datas.length,
                    list: newDatas
                }
            });
        }).catch(err => res.status(404).json(err));
    }
);


module.exports = router;
