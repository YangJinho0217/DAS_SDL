const express = require("express");
const router = express.Router();
const mysql = require("../loaders/mysql");
const crypto = require("crypto");
const calc = require('../module/calc');


/* ========== ============= ========== */
/* ========== 공지사항 등록 POST ========== */
/* ========== ============= ========== */
router.post('/addNoti', async (req, res) => {

    var param = {
        notice_title : req.body.notice_title,
        notice_description : req.body.notice_description,
        rgst_user_id : req.body.rgst_user_id
    }

   try {
        const noti_id = await mysql.value('comm', 'nextvalId', {id : 'noti_id'});
        param.noti_id = noti_id;
        await mysql.proc('comm', 'insertNoticeList', param);

        return res.json({
            resultCode : 200,
            resultMsg : '공지사항 등록 성공'
        })
   } catch(error) {
        console.log(error)
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
   }

})

router.get('/notiInfo', async(req, res) => {

    var param = {
        // notice_title : req.query.notice_title,
        // user_name : req.query.user_name
    }

    try {

        const notiList = await mysql.query('comm', 'selectNoticeListPaging', param);

        return res.json({
            resultCode : 200,
            resultMsg : '공지사항 조회 성공',
            data : notiList
        })

    } catch(error) {
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
    }
})

router.get('/detail', async(req, res) => {

    var param = {
        noti_id : req.query.noti_id
    }

    try {

        const notiListDetail = await mysql.select('comm', 'selectNoticeListDetail', param)

        return res.json({
            resultCode : 200,
            resultMsg : '공지사항 상세 조회 성공',
            data : notiListDetail
        })
    } catch(error) {
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
    }

})

module.exports = router;