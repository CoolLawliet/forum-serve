const express = require('express')
const router = express.Router();

const Type = require('../../models/types')
const {mySend, myError} = require('../../utils/send')

router.get('/getType', async (req, res) => {

    Type.find({}, (err, doc) => {
        if (err) {
            myError(res, err);
            return
        }
        mySend(res, {msg: "获取成功", data: doc})
    })
})

module.exports = router