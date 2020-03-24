const createError = require('http-errors');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const postParams = require('./utils/postParams');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const mongoose = require('mongoose');

const {mySend, myError} = require('./utils/send');
const { userModel } = require('./models/users');

// var history = require('connect-history-api-fallback');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const notNeedLoginPath =
    ['/api/users/login',
        '/api/users/addUser',
        '/api/users/userInfo',
        '/api/article',
        '/api/article/sort',
        '/api/article/detail',
        '/api/article/typeNum',
        '/admin/users/addUser',
        '/admin/users/editUser',
        '/admin/users/allUsers',
        '/admin/users/deleteUser',
        '/admin/users/login',
        '/admin/users/findPwd',
        '/admin/users/changePwd',
        '/admin/profiles/addType',
        '/admin/profiles/getType',
        '/admin/profiles/editType',
        '/admin/profiles/delType',
        '/admin/profiles/getPosts',
        '/admin/profiles/searchPost',
        '/admin/profiles/delPost',
        '/admin/profiles/getComment',
        '/admin/profiles/delComment',
        '/admin/users/getUserInfo',
        '/admin/users/delUserInfo',
        '/admin/users/editUserInfo',
        '/admin/users/searchUser',
    ];

//客户端端路由
const usersRouter = require('./routes/api/users');
const typeRouter = require('./routes/api/type');
const uploadRouter = require('./routes/api/upload');
const articleRouter = require('./routes/api/article');

//管理端
const adminRouter = require('./routes/admin/users');
const proFileRouter = require('./routes/admin/profiles');
//DB config
const db = require('./config/keys').mongoURI;

mongoose
    .connect(db, { useNewUrlParser: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.set('secret', 'jddlt')
app.set('_id', '')
app.set('params', '')
app.set('userInfo', {})
app.set('host', 'http://q739pxgpt.bkt.clouddn.com/')

//设置允许跨域访问该服务.  //wocao 放前面 md
app.all('*', async (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    //Access-Control-Allow-Headers ,可根据浏览器的F12查看,把对应的粘贴在这里就行
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Content-Type', 'application/json;charset=utf-8');
    next();
});
// 请求拦截
app.use(async function (req, res, next) {
    let params = {}
    if (req.method === 'GET') {
        params = req.query || {}
    } else if (req.method === 'POST') {
        params = await postParams(req) || {};
    }
    app.set('params', params); // 取参数都用 const params = app.get('params') 来取
    if (notNeedLoginPath.includes(req.url.split('?')[0])) {
        // if (req.method == 'POST') { app.set('params', params) }
        next();
    } else {
        if (params.token) {
            jwt.verify(params.token, app.get('secret'), (err, decode) => {
                if (err) {
                    mySend(res, {msg: '登录信息已失效', code: 401})
                } else {
                    if (decode.id) {
                        app.set('_id', decode.id) // 如何用户为有效token 则_id有值
                        userModel.findOne({_id: decode.id}, (err, res) => {
                            if (err) {
                                myError(res, err)
                                return
                            }
                            app.set('userInfo', res)
                            next();
                        })
                    } else {
                        mySend(res, {msg: '登录信息已失效', code: 401})
                    }
                }
            })
        } else {
            mySend(res, {msg: '未登录', code: 401})
        }0
    }
});

// passport 初始化
app.use(passport.initialize());

require('./config/passport')(passport);
//客户端接口
app.use('/api/users', usersRouter);
app.use('/api/article', articleRouter);
app.use('/api/type', typeRouter);
app.use('/api/upload', uploadRouter);

//管理端接口
app.use('/admin/users', adminRouter);
app.use('/admin/profiles', proFileRouter);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression());

//多资源托管
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

// console.log(app.get('host'));

module.exports = app;
// console.log(app);