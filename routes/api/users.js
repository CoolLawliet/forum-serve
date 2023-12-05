const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken");
var express = require('express');
var router = express.Router();
const postParams = require('../../utils/postParams')
const {userModel } = require('../../models/users')
const {articleModel} = require('../../models/articles')
const {mySend, myError} = require('../../utils/send')
const nodemailer = require('nodemailer');
require('dotenv').config();



// 获取用户信息
router.get('/userInfo',  (req, res) => {
    const params = req.query;
    if (req.headers.token.token) {
        jwt.verify(req.headers.token, req.app.get('secret'), (err, decode) => {
            if (err) {
                mySend(res, {msg: '登录信息已失效'})
            } else {
                if (decode.id) {
                    userModel.find({
                        _id: decode.id
                    }, (err, msg) => {
                        if (err) {
                            myError(res, err)
                        } else {
                            if (msg.length) {
                                req.app.set('userInfo', {...msg[0]._doc})
                                articleModel.countDocuments({id: decode.id}, (err, count) => {
                                    if (err) {
                                        myError(res, err)
                                    }
                                    mySend(res, {data: {...msg[0]._doc, article_num: count}, msg: '获取成功'})
                                })
                            } else {
                                mySend(res, {msg: '该用户不存在', code: 200})
                            }
                        }
                    })
                } else {
                    mySend(res, {msg: '登录信息已失效'})
                }
            }
        })
    } else {
        mySend(res, {msg: '未登录'})
    }
})

// 登录
router.post('/login',   (req, res) => {
    const params = req.app.get('params')
    userModel.find({
        email: params.email
    }, (err, msg) => {
        if (err) {
            myError(res, err)
        } else {
            if (msg.length) {
                // 验证密码是否正确
                const isTrue = bcrypt.compareSync(params.password, msg[0].password)
                if (isTrue) {
                    const token = jwt.sign({id: msg[0]._id}, req.app.get("secret"));
                    mySend(res, {msg: '登陆成功', data: {token}})
                } else {
                    mySend(res, {msg: '密码错误', code: 400})
                }
            } else {
                mySend(res, {msg: '该邮箱暂未注册', code: 400})
            }
        }
    })
})

// 编辑用户信息
router.post('/editUserInfo',  (req, res) => {
    // const params = app.get('params')
    const {name, email, sex, label, tips, _id} = req.app.get('params')
    userModel.updateOne({_id}, {
        '$set': {
            'name': name,
            'email': email,
            'sex': sex,
            'label': label,
            'tips': tips
        }
    }, (err, msg) => {
        if (err) {
            myError(res, err)
            return
        }
        mySend(res, {msg: '修改成功'})
    });
})

// 注册
router.post('/addUser',  (req, res) => {
    const host = req.app.get('host')
    const params = req.app.get('params')
    const findName = new Promise((resolve, reject) => {
        userModel.find({
            name: params.name
        }, (err, msg) => {
            if (err) {
                reject('未知错误')
            } else {
                if (msg.length) {
                    reject('昵称已重复')
                } else {
                    resolve()
                }
            }
        })
    })
    const findemail = new Promise((resolve, reject) => {
        userModel.find({
            email: params.email
        }, (err, msg) => {
            if (err) {
                reject('未知错误')
            } else {
                if (msg.length) {
                    reject('邮箱已被注册')
                } else {
                    resolve()
                }
            }
        })
    })
    Promise.all([findName, findemail]).then(() => {
        userModel.create({
            name: params.name,
            email: params.email,
            password: params.password,
            avatar: host + 'no-avatar-' + Math.ceil(Math.random() * 10) + '.png',
            date: new Date().getTime()
        }, err => {
            if (err) {
                myError(res, err)
                return
            }
            mySend(res, {msg: '创建成功'})
        })
    }).catch(err => {
        mySend(res, {msg: err, code: 400})
    })
})

module.exports = router
