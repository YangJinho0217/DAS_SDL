const express                       = require("express");
const verifyToken                   = require('../loaders/token').verify;
const router                        = express.Router();
const mysql                         = require("../loaders/mysql");
const calc                          = require('../module/calc');
const sql                           = require("mysql2/promise");
const dbconfig                      = require("../config/db");
const pool                          = sql.createPool(dbconfig);
const specificString                = calc.specificString();

/* ========== ============= ========== */
/* ========== 공지사항 등록 POST ========== */
/* ========== ============= ========== */
router.post('/addNoti', verifyToken, async (req, res) => {

    var param = {
        notice_title : req.body.notice_title,
        notice_description : req.body.notice_description,
        rgst_user_id : req.body.rgst_user_id
    }

    const con = await pool.getConnection();
    try {

        await con.beginTransaction();

        await calc.logInfo('Interface', `${specificString}/das/user/addNoti`);

        const noti_id = await mysql.value('comm', 'nextvalId', {id : 'noti_id'}, con);
        param.noti_id = noti_id;
        await mysql.proc('comm', 'insertNoticeList', param, con);

        await con.commit();
        return res.json({
            resultCode : 200,
            resultMsg : '공지사항 등록 성공'
        })
    } catch(error) {
        console.log(error)
        await con.rollback();
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
    } finally {
        await con.release();
    }

})

/* ========== ============= ========== */
/* ========== 공지사항 리스트 GET ========== */
/* ========== ============= ========== */
router.get('/notiInfo', verifyToken, async(req, res) => {

    const con = await pool.getConnection();
    try {

        await con.beginTransaction();

        await calc.logInfo('Interface', `${specificString}/das/user/notiInfo`);

        const notiList = await mysql.query('comm', 'selectNoticeList', null, con);

        await con.commit();
        return res.json({
            resultCode : 200,
            resultMsg : '공지사항 조회 성공',
            data : notiList
        })

    } catch(error) {
        console.log(error)
        await con.rollback();
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
    } finally {
        await con.release();
    }
})

/* ========== ============= ========== */
/* ========== 공지사항 상세 GET ========== */
/* ========== ============= ========== */
router.get('/detail', verifyToken, async(req, res) => {

    var param = {
        noti_id : req.query.noti_id
    }

    const con = await pool.getConnection();
    try {

        await con.beginTransaction();

        await calc.logInfo('Interface', `${specificString}/das/user/detail`);
        
        const notiListDetail = await mysql.select('comm', 'selectNoticeListDetail', param, con)

        await con.commit();
        return res.json({
            resultCode : 200,
            resultMsg : '공지사항 상세 조회 성공',
            data : notiListDetail
        })
    } catch(error) {
        console.log(error)
        await con.rollback();
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
    } finally {
        await con.release();
    }

})

module.exports = router;