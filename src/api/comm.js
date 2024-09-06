const express                             = require("express");
const verifyToken                         = require('../loaders/token').verify;
const router                              = express.Router();
const mysql                               = require("../loaders/mysql");
const calc                                = require('../module/calc');
const sql                                 = require("mysql2/promise");
const dbconfig                            = require("../config/db");
const resultCode                          = require('../module/result');
const pool                                = sql.createPool(dbconfig);
const specificString                      = calc.specificString();
const { body,query, validationResult }    = require('express-validator');

/* ========== ============= ========== */
/* ========== 공지사항 등록 POST ========== */
/* ========== ============= ========== */
router.post('/addNoti', verifyToken,
    [
        body('notice_title').notEmpty().withMessage('Notice Title is required').isString().withMessage('Notice Title must be a number.'),
        body('notice_description').notEmpty().withMessage('Notice Description is required').isString().withMessage('Notice Description must be a string.'),
        body('rgst_user_id').notEmpty().withMessage('Regist User is required').isNumeric().withMessage('Regist User must be a number.')
    ],
    async (req, res) => {
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            notice_title : req.body.notice_title,
            notice_description : req.body.notice_description,
            rgst_user_id : req.body.rgst_user_id
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/comm/addNoti`);

            const noti_id = await mysql.value('comm', 'nextvalId', {id : 'noti_id'}, con);
            param.noti_id = noti_id;
            await mysql.proc('comm', 'insertNoticeList', param, con);

            await con.commit();
            return res.json(await calc.resJson(200, 'SUCCESS', null, null))
        } catch(error) {
            console.log(error)
            await con.rollback();
            return res.json(resultCode.SERVER_ERROR)
        } finally {
            await con.release();
        }
    }
)

/* ========== ============= ========== */
/* ========== 공지사항 리스트 GET ========== */
/* ========== ============= ========== */
router.get('/notiInfo', verifyToken, async(req, res) => {

    const con = await pool.getConnection();
    try {

        await con.beginTransaction();

        await calc.logInfo('Interface', `${specificString}/das/comm/notiInfo`);

        const notiList = await mysql.query('comm', 'selectNoticeList', null, con);

        await con.commit();
        return res.json(await calc.resJson(200, 'SUCCESS', notiList, null))

    } catch(error) {
        console.log(error)
        await con.rollback();
        return res.json(resultCode.SERVER_ERROR)
    } finally {
        await con.release();
    }
})

/* ========== ============= ========== */
/* ========== 공지사항 상세 GET ========== */
/* ========== ============= ========== */
router.get('/detail', verifyToken,
    [
        body('noti_id').notEmpty().withMessage('Notice Id is required').isNumeric().withMessage('Notice Id must be a number.')
    ],
    async(req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            noti_id : req.query.noti_id
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/comm/detail`);
            
            const notiListDetail = await mysql.select('comm', 'selectNoticeListDetail', param, con)
            if (await calc.isEmptyObject(notiListDetail)) {
                return res.json(await calc.resJson(400, '공지사항이 존재하지 않습니다', null, null))
            }

            await con.commit();
            return res.json(await calc.resJson(200, 'SUCCESS', notiListDetail, null))
        } catch(error) {
            console.log(error)
            await con.rollback();
            return res.json(resultCode.SERVER_ERROR)
        } finally {
            await con.release();
        }
    }
)

module.exports = router;