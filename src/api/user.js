const express = require("express");
const router = express.Router();
const mysql = require("../loaders/mysql");
const calc = require('../module/calc');
const verifyToken = require('../loaders/token').verify
const token = require('../loaders/token')
require('dotenv').config();
const sql = require("mysql2/promise");
const dbconfig = require("../config/db");
const pool = sql.createPool(dbconfig);

/* ========== ============= ========== */
/* ========== 유저 로그인 POST ========== */
/* ========== ============= ========== */
router.post('/signIn', async (req, res) => {

    var param = {
        login_id : req.body.login_id,
        login_pw : req.body.login_pw
    };

    const con = await pool.getConnection();
    try {

        await con.beginTransaction();
        const user = await mysql.select("user", "selectUserInfo", param, con);

        /* 아이디 존재 체크 */
        if (await calc.isEmptyObject(user)) {
            return res.json({
                resultCode : 400,
                resultMsg : '아이디가 존재하지 않습니다'
            })
        };

        if (user.isFirst == 1) {
            await mysql.proc('user', 'updateUserInfoIsFirst', param, con);
        }

        /* 비밀번호 체크 */
        const userDBPassword = user.loginPw;
        const decryptPassword = await calc.decryptPassword(userDBPassword);

        if (param.login_pw != decryptPassword) {
            return res.json({
                resultCode : 400,
                resultMsg : '비밀번호가 일치하지 않습니다',
            })
        };

        const data = {
            userId : user.userId,
            loginId : user.loginId,
            isFirst : user.isFirst,
            userName : user.userName,
            userLevel : user.userLevel,
            userStatus : user.userStatus,
            userRole : user.userRole,
            rgstDtm : user.rgstDtm
        }

        await con.commit();
        return res.json({
            resultCode : 200,
            resultMsg : '로그인 성공',
            data : data,
            token : token.create(user.userId)
        });

    } catch(error) {
        console.log(error)
        await con.rollback();
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
    } finally {
        con.release(); // 연결 해제
    }
    
})

/* ========== ============= ========== */
/* ========== 유저 회원가입 이메일 인증코드 보내기 POST ========== */
/* ========== ============= ========== */
router.post('/sendEmailAuth', async (req, res) => {

    var param = {
        login_id : req.body.login_id
    }

    const con = await pool.getConnection();
    try {

        await con.beginTransaction();
        const emailAuthCode = await calc.createEmailAuthCode();
        // /* 이메일 전송  */
        await calc.emailAuthSend(param.login_id, emailAuthCode).then(async (response) => {
            if (response.resultCode == 200) {
                param.auth_code = response.data
                await mysql.proc('user', 'insertUserAuth', param, con)
            } else {
                return res.json({
                    resultCode : response.resultCode,
                    resultMsg : response.resultMsg
                })
            }
        })
    
        await con.commit();
        return res.json({
            resultCode : 200,
            resultMsg : '인증코드 발송 성공'
        })

    } catch(error) {
        await con.rollback();
        console.log(error)
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
    } finally {
        await con.release();
    }
   
})

/* ========== ============= ========== */
/* ========== 유저 회원가입 이메일 인증 POST ========== */
/* ========== ============= ========== */
router.post('/authEmailCode', async (req, res) => {

    var param = {
        login_id : req.body.login_id,
        auth_code : req.body.auth_code
    }

    const con = await pool.getConnection();
    try {

        await con.beginTransaction();
        const user = await mysql.query('user', 'selectUserAuth', param, con);

        if(user.length < 1) {
            return res.json({
                resultCode : 400,
                resultMsg : '아이디가 존재하지 않습니다'
            })
        }

        const userDBauthCode = user[0].authCode;
        if(param.auth_code != userDBauthCode) {
            return res.json({
                resultCode : 400,
                resultMsg : '인증번호가 일치하지 않습니다'
            })
        }

        await con.commit();
        return res.json({
            resultCode : 200,
            resultMsg : '이메일 인증에 성공했습니다'
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
/* ========== 유저 회원가입 POST ========== */
/* ========== ============= ========== */
router.post('/signUp', async (req, res) => {
    
    var param = {
        login_id  : req.body.login_id,
        login_pw  : req.body.login_pw,
        user_name : req.body.user_name,
        user_level : req.body.user_level,
        isfirst : 1,
        user_status : 'A'
    };

    const con = await pool.getConnection();
    try {
        /* 회원가입 이메일 중복확인 */
        await con.beginTransaction();
        var user = await mysql.select("user", "selectUserInfo", param, con);

        if (await calc.isEmptyObject(user)) {
            return res.json({
                resultCode : 400,
                resultMsg : '아이디가 존재합니다.'
            })
        };

        if (param.user_level == 1) {
            return res.json({
                resultCode : 400,
                resultMsg : '시스템 관리자는 추가할 수 없습니다.'
            })
        }

        param.user_id = await mysql.value('user', 'nextvalAppUserId', {id : 'user_id'}, con);
        const encryptNewPassword = await calc.encryptPassword(param.login_pw);
        param.login_pw = encryptNewPassword;

        // /* 회원가입 insert */
        await mysql.proc("user", "insertUserInfo", param, con);
        
        await con.commit();
        return res.json({
            resultCode : 200,
            resultMsg : '회원가입 요청 성공'
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
/* ========== 유저 상태변경 POST ========== */
/* ========== ============= ========== */
router.put('/signOn' , async(req,res) => {

    var param = {
        login_id : req.body.login_id,
        user_status : req.body.user_status,
        admin_id : req.body.admin_id
    }

    const con = await pool.getConnection();
    try {

        await con.beginTransaction();
        const user = await mysql.query("user", "selectUserInfo", param, con);

        /* 아이디 존재 체크 */
        if (user.length < 1) {
            return res.json({
                resultCode : 400,
                resultMsg : '아이디가 존재하지 않습니다'
            })
        };

        await mysql.proc("user", "updateUserStatus", param, con);

        await con.commit();
        return res.json({
            resultCode : 200,
            resultMsg : '사용자 상태 변경 완료'
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
/* ========== 유저 비밀번호 찾기 POST ========== */
/* ========== ============= ========== */
router.post('/frgtEml' , async(req,res) => {

    var param = {
        login_id : req.body.login_id
    }

    const con = await pool.getConnection();
    try {

        await con.beginTransaction();
        const user = await mysql.select("user", "selectUserInfo", param, con);
        
        /* 아이디 존재 체크 */
        if (await calc.isEmptyObject(user)) {
            return res.json({
                resultCode : 400,
                resultMsg : '가입되어 있지 않은 이메일 입니다'
            })
        };

        const userDBPassword = user.loginPw;
        const decryptPassword = await calc.decryptPassword(userDBPassword);

        /* 이메일 전송  */
        await calc.emailSend(param.login_id, 'F', decryptPassword).then((response) => {

            if (response.resultCode == 200) {
                return res.json({
                    resultCode : 200,
                    resultMsg : "비밀번호 찾기 이메일 전송 성공"
                })
            } else {
                return res.json({
                    resultCode : response.resultCode,
                    resultMsg : response.resultMsg
                })
            }
        })
        await con.commit();
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
/* ========== 유저 비밀번호 변경 POST ========== */
/* ========== ============= ========== */
router.put('/modify', verifyToken, async(req,res) => {

    var param = {
        login_id : req.body.login_id,
        isfirst : 0,
        current_password : req.body.current_password,
        new_password : req.body.new_password,
    }

    const con = await pool.getConnection();
    try {

        await con.beginTransaction();
        const user = await mysql.select("user", "selectUserInfo", param, con);

        /* 아이디 존재 체크 */
        if (await calc.isEmptyObject(user)) {
            return res.json({
                resultCode : 400,
                resultMsg : '아이디가 존재하지 않습니다'
            })
        };

        /* 비밀번호 체크 */
        const userDBPassword = user.loginPw;
        const decryptPassword = await calc.decryptPassword(userDBPassword);

        if (param.current_password != decryptPassword) {
            return res.json({
                resultCode : 400,
                resultMsg : '비밀번호가 일치하지 않습니다',
            })
        };

        const encryptNewPassword = await calc.encryptPassword(param.new_password);
        param.new_password = encryptNewPassword;

        await mysql.proc("user", "updateModify", param, con)

        await con.commit();
        return res.json({
            resultCode : 200,
            resultMsg : '비밀번호 변경 성공'
        });
        
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
/* ========== 유저 리스트 GET ========== */
/* ========== ============= ========== */
router.get('/dvList',verifyToken, async(req,res) => {

    var param = {
        user_level : req.query.user_level
    }

    const con = await pool.getConnection();
    try {

        await con.beginTransaction();
        const dvList = await mysql.query("user", "selectDvList", param, con)

        await con.commit();
        return res.json({
            resultCode : 200,
            resultMsg : 'OK',
            data : dvList
        })
    } catch(error) {
        await calc.logError('/dvList', error.message)
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
/* ========== 유저 패스워드 복호화 POST ========== */
/* ========== ============= ========== */
router.post('/chPw', async(req,res) => {

    var param = {
        password : req.body.password
    }

    const con = await pool.getConnection();
    try {
        const userPassword = await calc.decryptPassword(param.password);
        return res.json({
            resultCode : 200,
            resultMsg : '복호화 성공',
            data : userPassword
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