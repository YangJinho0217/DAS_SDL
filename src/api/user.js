const express = require("express");
const router = express.Router();
const mysql = require("../loaders/mysql");
const calc = require('../module/calc');
const jwt = require('jsonwebtoken');
const verifyToken = require('../loaders/token').verify
const token = require('../loaders/token')
require('dotenv').config();


/* ========== ============= ========== */
/* ========== 유저 리스트 GET ========== */
/* ========== ============= ========== */
router.get('/', async (req, res) => {
    var param = {
        page_no : req.query.page_no
    }

    // 전체 데이터 개수
    const count = await mysql.select("user", "selctCountUserInfoList");

    // === 페이징 처리 내부 함수 === //
    const itemPerPage = 10;
    const currentPage = (param.page_no - 1) * itemPerPage;
    // 페이지당 처리 개수 10개로 고정
    param.itemPerPage = 10;
    // 페이지번호
    param.currentPage = currentPage;

    const userList = await mysql.query("user", "selectUserInfoList", param);

    const totalPageCount = Math.ceil(count.totalCount / itemPerPage);
    return res.json({
        resultCode : 200,
        resultCode : '유저 리스트 출력 완료',
        totalPageCount : totalPageCount,
        data : userList
    })

})

/* ========== ============= ========== */
/* ========== 유저 로그인 POST ========== */
/* ========== ============= ========== */
router.post('/signIn', async (req, res) => {

    var param = {
        login_id : req.body.login_id,
        login_pw : req.body.login_pw
    };

    try {

        const user = await mysql.query("user", "selectUserInfo", param);

        /* 아이디 존재 체크 */
        if (user.length < 1) {
            return res.json({
                resultCode : 400,
                resultMsg : '아이디가 존재하지 않습니다'
            })
        };

        if (user[0].isFirst == 1) {
            await mysql.proc('user', 'updateUserInfoIsFirst', param);
        }

        /* 비밀번호 체크 */
        const userPassword = await mysql.select("user", "selectUserPassword", param);
        const userDBPassword = userPassword.loginPw;
        const decryptPassword = await calc.decryptPassword(userDBPassword);

        if (param.login_pw != decryptPassword) {
            return res.json({
                resultCode : 400,
                resultMsg : '비밀번호가 일치하지 않습니다',
            })
        };

        return res.json({
            resultCode : 200,
            resultMsg : '로그인 성공',
            data : user[0],
            token : token.create(user[0].userId)
        });

    } catch(error) {
        console.log(error)
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
    }
    
})

/* ========== ============= ========== */
/* ========== 유저 회원가입 이메일 인증코드 보내기 POST ========== */
/* ========== ============= ========== */
router.post('/sendEmailAuth', async (req, res) => {

    var param = {
        login_id : req.body.login_id
    }

    try {

        const emailAuthCode = await calc.createEmailAuthCode();
        // /* 이메일 전송  */
        await calc.emailAuthSend(param.login_id, emailAuthCode).then(async (response) => {
            if (response.resultCode == 200) {
                param.auth_code = response.data
                await mysql.proc('user', 'insertUserAuth', param)
            } else {
                return res.json({
                    resultCode : response.resultCode,
                    resultMsg : response.resultMsg
                })
            }
        })
    
        return res.json({
            resultCode : 200,
            resultMsg : '인증코드 발송 성공'
        })

    } catch(error) {
        console.log(error)
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
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

    try {

        const user = await mysql.query('user', 'selectUserAuth', param);

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

        return res.json({
            resultCode : 200,
            resultMsg : '이메일 인증에 성공했습니다'
        })
    } catch(error) {
        console.log(error)
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
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

    try {
        /* 회원가입 이메일 중복확인 */
        var user = await mysql.query("user", "selectUserInfo", param);

        if (user.length > 0) {
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

        param.user_id = await mysql.value('user', 'nextvalAppUserId', {id : 'user_id'});

        const encryptNewPassword = await calc.encryptPassword(param.login_pw);
        param.login_pw = encryptNewPassword;

        // /* 회원가입 insert */
        await mysql.proc("user", "insertUserInfo", param);
        
        return res.json({
            resultCode : 200,
            resultMsg : '회원가입 요청 성공'
        })

    } catch(error) {
        console.log(error)
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
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

    try {
        const user = await mysql.query("user", "selectUserInfo", param);

        /* 아이디 존재 체크 */
        if (user.length < 1) {
            return res.json({
                resultCode : 400,
                resultMsg : '아이디가 존재하지 않습니다'
            })
        };

        await mysql.proc("user", "updateUserStatus", param);

        return res.json({
            resultCode : 200,
            resultMsg : '사용자 상태 변경 완료'
        })

    } catch(error) {
        console.log(error)
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
    }

})

/* ========== ============= ========== */
/* ========== 유저 비밀번호 찾기 POST ========== */
/* ========== ============= ========== */
router.post('/frgtEml' , async(req,res) => {

    var param = {
        login_id : req.body.login_id
    }

    try {

        const user = await mysql.query("user", "selectUserInfo", param);
        /* 아이디 존재 체크 */
        if (user.length < 1) {
            return res.json({
                resultCode : 400,
                resultMsg : '가입되어 있지 않은 이메일 입니다'
            })
        };

        const userPassword = await mysql.select("user", "selectUserPassword", param);
        const userDBPassword = userPassword.loginPw;
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
    } catch(error) {
        console.log(error)
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
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

    try {
        const user = await mysql.query("user", "selectUserInfo", param);

        /* 아이디 존재 체크 */
        if (user.length < 1) {
            return res.json({
                resultCode : 400,
                resultMsg : '아이디가 존재하지 않습니다'
            })
        };

        /* 비밀번호 체크 */
        const userPassword = await mysql.select("user", "selectUserPassword", param);
        const userDBPassword = userPassword.loginPw;
        const decryptPassword = await calc.decryptPassword(userDBPassword);

        if (param.current_password != decryptPassword) {
            return res.json({
                resultCode : 400,
                resultMsg : '비밀번호가 일치하지 않습니다',
            })
        };

        const encryptNewPassword = await calc.encryptPassword(param.new_password);
        param.new_password = encryptNewPassword;

        await mysql.proc("user", "updateModify", param)

        return res.json({
            resultCode : 200,
            resultMsg : '비밀번호 변경 성공'
        });
        
    } catch(error) {
        console.log(error)
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
    }
    
})

/* ========== ============= ========== */
/* ========== 유저 리스트 GET ========== */
/* ========== ============= ========== */
router.get('/dvList',verifyToken, async(req,res) => {

    var param = {
        user_level : req.query.user_level
    }

    try {
        const dvList = await mysql.query("user", "selectDvList", param)

        return res.json({
            resultCode : 200,
            resultMsg : 'OK',
            data : dvList
        })
    } catch(error) {
        console.log(error)
        return res.json({
            resultCode : 500,
            resultMsg : 'SERVER ERROR'
        })
    }

})


module.exports = router;