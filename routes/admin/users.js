const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const keys = require('../../config/keys');
const passport = require('passport');
const mongoose = require('mongoose')
mongoose.set('useFindAndModify', false)

const nodemailer = require('nodemailer');
require('dotenv').config();

const postParams = require('../../utils/postParams');
const Admin = require('../../models/admins');
const {userModel} = require('../../models/users');
const {mySend, myError} = require('../../utils/send');

//添加管理员
router.post('/addUser',
    // passport.authenticate('jwt', {session: false}),
    (req, res) => {
        const host = req.app.get('host');
        const params = req.app.get('params');
        Admin.find().then(users => {
            if (users.length <= 10) {
                //查询数据库中是否拥有邮箱
                Admin.findOne({username: params.username}).then(user => {
                    if (user) {
                        mySend(res, {msg: '用户名已被注册', status: 200})
                    } else {
                        const avatar = host + 'no-avatar-' + Math.ceil(Math.random() * 10) + '.png'
                        let des = '';
                        let role = '';

                        if (params.key === 'admin') {
                            des = 'Super Administrator. Have access to view all pages.';
                            role = '管理员';
                        } else if (params.key === 'editor') {
                            des = 'Normal Editor. Can see all pages except permission page';
                            role = '客服';
                        }

                        const newUser = new Admin({
                            username: params.username,
                            pwd: '123456',
                            avatar,
                            key: params.key,
                            role,
                            des
                        });

                        newUser.save().then(user => {
                            mySend(res, {status: 200, msg: '添加用户成功', data: newUser})
                        }).catch(err => console.log(err))
                    }
                })
            } else {
                mySend(res, {status: 400, msg: '最多能添加10个用户'})
            }
        })

    });

//管理员登录
router.post('/login', (req, res) => {
    const params = req.app.get('params');
    const username = params.username;
    const pwd = params.pwd;
    // console.log(pwd);
    const autoLogin = params.autoLogin;
    //查数据库
    Admin.findOne({username}).then(user => {
        if (!user) {
            return mySend(res, {status: 400, msg: '用户不存在'})
        }
        if (params.username === 'admin' && pwd === '123456') {
            const rule = {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                key: user.key
            };

            jwt.sign(
                rule,
                keys.secretOrKey,
                {expiresIn: autoLogin?604800 : 3600},
                (err,token)=>{
                    if (err) myError(req,res)
                    res.status(200).json({
                        msg: '登录成功',
                        token: 'Bearer ' + token
                    });
                }
            );
        }else {
            //密码匹配
            if (pwd ===user.pwd){
                const rule={
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar,
                    key: user.key
                };
                jwt.sign(
                    rule,
                    keys.secretOrKey,
                    { expiresIn: autoLogin ? 604800 : 3600 },
                    (err, token) => {
                        if (err) throw err;
                        res.json({
                            state: 'suc',
                            msg: '登录成功',
                            token: 'Bearer ' + token
                        });
                    }
                );
            }else {
                mySend(res,{msg:'密码错误',status:400})
            }
        }
    })
});

//编辑管理员
router.post(
    '/editUser',
    // passport.authenticate('jwt', { session: false }),
    (req, res) => {
        const params = req.app.get('params');
        const _id = mongoose.Types.ObjectId(params.id);

        if (params.key === 'admin') {
            params.des = 'Super Administrator. Have access to view all pages.';
            params.role = '管理员';
        } else if (params.key === 'editor') {
            params.des =
                'Normal Editor. Can see all pages except permission page';
            params.role = '客服';
        }

        Admin.updateOne({_id}, {
            '$set': {
                'username': params.username,
                'key': params.key,
                'role': params.role,
                'des': params.des,
                'date': params.date,
            }
        }, (err, msg) => {
            if (err) {
                myError(res, err)
                return
            }
            mySend(res, {msg: '修改成功'})
        })
    }
);

//获取所有用户信息
router.get(
    '/allUsers',
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        Admin.find()
            .then(users => {
                if (!users) {
                    mySend(res,{msg:'没有任何用户信息',status:400})
                }
                res.status(200).json({
                    state: 'suc',
                    msg: '成功获取所有用户信息',
                    total: users.length,
                    data: users
                });
            })
            .catch(err => res.status(400).json(err));
    }
);

//删除管理员
router.post('/deleteUser',
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        const params = req.app.get('params');
        const _id = params.id;
       Admin.findByIdAndDelete({_id},(err,msg)=>{
           if (err) {
               mySend(res, {msg: '删除用户失败',status:404})

           } else {
               mySend(res, {msg: '删除用户成功',status:200})
           }
       })
    });

//返回修改密码成功
router.post(
    '/changePwd',
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        const params = req.app.get('params');
        Admin.findOne({ username: params.username }).then(user => {
            if (!user) {
                mySend(res,{msg:'该用户不存在',status:400});
            } else {
                const newUser = {
                    username: params.username ? params.username : user.username,
                    pwd: params.pwd ? params.pwd : '123456',
                    avatar: params.avatar ? params.avatar : user.avatar,
                    key: params.key ? params.key : user.key,
                    role: params.role ? params.role : user.role,
                    des: params.des ? params.des : user.des
                };

                Admin.findOneAndUpdate(
                    { _id: user._id },
                    { $set: newUser },
                    { new: true }
                ).then(() =>
                    mySend(res,{msg:'密码修改成功',status:200})
            );
            }
        });
    }
);
//找回密码
router.post('/findPwd', (req, res) => {
    const params = req.app.get('params');
    Admin.findOne({ username: params.username }).then(user => {
        if (!user) {
            mySend(res,{msg:'该用户不存在',status:400})
        } else {
            // step1
            let transporter = nodemailer.createTransport({
                host: 'smtp.qq.com',
                port: 465,
                // service: 'qq',
                secure: true,
                auth: {
                    // user: process.env.EMAIL,
                    // pass: process.env.PASSWORD
                    user: '531549304@qq.com',
                    pass: 'vpcxululaxrvcbba'
                }
            });

            // step2
            let mailOptions = {
                from: '531549304@qq.com',
                to: params.email,
                subject: '密码找回',
                text: `您的账号是${user.username},密码是: ${user.pwd}`
            };

            // step3
            transporter.sendMail(mailOptions, (err, data) => {
                if (err) {
                    res.status(400).json(err);
                } else {
                    mySend(res,{msg:`密码已发送至您的${params.email}邮箱`,status:200})

                }
            });
        }
    });
});

//获取用户信息
router.get('/getUserInfo',
    passport.authenticate('jwt', {session: false}),
    (req, res) => {
        let page = parseInt(req.query.page);
        let size = parseInt(req.query.size);
        // console.log(req.query);
        userModel.countDocuments({}, (err, count) => {
            if (err) {
                myError(res, err);
                return
            }
            userModel.find({})
                .skip(size * ((page ? page : 1) - 1))
                .sort({'_id': -1})
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
//检索用户
router.get('/searchUser',
    // passport.authenticate('jwt', {session: false}),
    (req, res) => {
        let kw = req.query.kw;
        let datas = [];
        userModel.find().then(users => {
            if (!users) {
                return res.status(404).json('没有任何用户信息');
            }
            users.forEach(user => {
                if (user.name.indexOf(kw) !== -1) datas.push(user);
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
)
//编辑用户
router.post('/editUserInfo',
    passport.authenticate('jwt', {session: false}),
    (req, res) => {
        const params = req.app.get('params');
        const _id = mongoose.Types.ObjectId(params.id);
        // const { name, tips, _id} = req.app.get('params')
        userModel.updateOne({_id}, {
            '$set': {
                'name': params.name,
                'tips': params.tips,
            }
        }, (err, msg) => {
            if (err) {
                myError(res, err);
                return
            }
            mySend(res, {msg: '修改成功'})
        });
    });
//删除用户
router.post('/delUserInfo',
    passport.authenticate('jwt', {session: false}),
    (req, res) => {
        const params = req.app.get('params');
        const _id = params.id;
        userModel.findByIdAndDelete({_id}, (err, msg) => {
            if (err) {
                myError(res, err)
            } else {
                mySend(res, {msg: '删除成功'})
            }
        })
    }
);

module.exports = router