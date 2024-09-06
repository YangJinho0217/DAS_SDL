const express                             = require("express");
const verifyToken                         = require('../loaders/token').verify;
const router                              = express.Router();
const mysql                               = require("../loaders/mysql");
const calc                                = require('../module/calc');
const token                               = require('../loaders/token')
const sql                                 = require("mysql2/promise");
const dbconfig                            = require("../config/db");
const resultCode                          = require('../module/result');
const pool                                = sql.createPool(dbconfig);
const specificString                      = calc.specificString();
const { body,query, validationResult }    = require('express-validator');

/* ========== ============= ========== */
/* ========== 유저 로그인 POST ========== */
/* ========== ============= ========== */
router.post('/signIn',
    [
        body('login_id').notEmpty().withMessage('Login Id is required').isString().withMessage('Login Id must be a string.'),
        body('login_pw').notEmpty().withMessage('Login Pw is required').isString().withMessage('Login Pw must be a string.')
    ],
    async (req, res) => {
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            login_id : req.body.login_id,
            login_pw : req.body.login_pw
        };

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/user/signIn`);

            const user = await mysql.select("user", "selectUserInfo", param, con);

            /* 아이디 존재 체크 */
            if (await calc.isEmptyObject(user)) {
                return res.json(await calc.resJson(400, '아이디가 존재하지 않습니다', null, null))
            };

            if (user.isFirst == 1) {
                await mysql.proc('user', 'updateUserInfoIsFirst', param, con);
            }

            /* 비밀번호 체크 */
            const userDBPassword = user.loginPw;
            const decryptPassword = await calc.decryptPassword(userDBPassword);

            if (param.login_pw != decryptPassword) {
                return res.json(await calc.resJson(400, '비밀번호가 일치하지 않습니다', null, null))
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
            return res.json(await calc.resJson(200, 'SUCCESS', data, token.create(user.userId)))

        } catch(error) {
            console.log(error)
            await con.rollback();
            return res.json(resultCode.SERVER_ERROR)
        } finally {
            con.release(); // 연결 해제
        }
    }
)

/* ========== ============= ========== */
/* ========== 유저 회원가입 이메일 인증코드 보내기 POST ========== */
/* ========== ============= ========== */
router.post('/sendEmailAuth',
    [
        body('login_id').notEmpty().withMessage('Login Id is required').isString().withMessage('Login Id must be a string.')
    ],
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            login_id : req.body.login_id
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/user/sendEmailAuth`);

            const user = await mysql.select('user', 'selectUserInfo', param, con);

            if (!await calc.isEmptyObject(user)) {
                return res.json(await calc.resJson(400, '이미 존재하는 이메일이 있습니다', null, null))
            }

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
            return res.json(await calc.resJson(200, 'SUCCESS', null, null))

        } catch(error) {
            await con.rollback();
            console.log(error)
            return res.json(resultCode.SERVER_ERROR)
        } finally {
            await con.release();
        }
    }
)

/* ========== ============= ========== */
/* ========== 유저 회원가입 이메일 인증 POST ========== */
/* ========== ============= ========== */
router.post('/authEmailCode',
    [
        body('login_id').notEmpty().withMessage('Login Id is required').isString().withMessage('Login Id must be a string.'),
        body('auth_code').notEmpty().withMessage('Auth Code is required').isString().withMessage('Auth Code must be a string.')
    ],
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            login_id : req.body.login_id,
            auth_code : req.body.auth_code
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/user/authEmailCode`);

            const user = await mysql.query('user', 'selectUserAuth', param, con);

            if(user.length < 1) {
                return res.json(await calc.resJson(400, '아이디가 존재하지 않습니다', null, null))
            }

            const userDBauthCode = user[0].authCode;
            if(param.auth_code != userDBauthCode) {
                return res.json(await calc.resJson(400, '인증번호가 일치하지 않습니다', null, null))
            }

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
/* ========== 유저 회원가입 POST ========== */
/* ========== ============= ========== */
router.post('/signUp',
    [
        body('login_id').notEmpty().withMessage('Login Id is required').isString().withMessage('Login Id must be a string.'),
        body('login_pw').notEmpty().withMessage('login Pw is required').isString().withMessage('Login Pw must be a string.'),
        body('user_name').notEmpty().withMessage('User Name is required').isString().withMessage('User Name must be a string.'),
        body('user_level').notEmpty().withMessage('User Level is required').isNumeric().withMessage('User Level must be a number.')
    ],
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }
    
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

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/user/signUp`);

            var user = await mysql.select("user", "selectUserInfo", param, con);

            if (!await calc.isEmptyObject(user)) {
                return res.json(await calc.resJson(400, '아이디가 존재합니다', null, null))
            };

            if (param.user_level == 1) {
                return res.json(await calc.resJson(400, '시스템 관리자는 추가할 수 없습니다', null, null))
            }

            param.user_id = await mysql.value('user', 'nextvalAppUserId', {id : 'user_id'}, con);
            const encryptNewPassword = await calc.encryptPassword(param.login_pw);
            param.login_pw = encryptNewPassword;

            // /* 회원가입 insert */
            await mysql.proc("user", "insertUserInfo", param, con);
            
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
/* ========== 유저 상태변경 POST ========== */
/* ========== ============= ========== */
router.put('/signOn' ,
    [
        body('login_id').notEmpty().withMessage('Login Id is required').isString().withMessage('Login Id must be a string.'),
        body('user_status').notEmpty().withMessage('User Status is required').isString().withMessage('User Status must be a string.'),
        body('admin_id').notEmpty().withMessage('Admin Id is required').isNumeric().withMessage('Admin Id must be a number.')
    ],
    async(req,res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            login_id : req.body.login_id,
            user_status : req.body.user_status,
            admin_id : req.body.admin_id
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/user/signOn`);

            const user = await mysql.query("user", "selectUserInfo", param, con);

            /* 아이디 존재 체크 */
            if (user.length < 1) {
                return res.json(await calc.resJson(400, '아이디가 존재하지 않습니다', null, null))
            };

            await mysql.proc("user", "updateUserStatus", param, con);

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
/* ========== 유저 비밀번호 찾기 POST ========== */
/* ========== ============= ========== */
router.post('/frgtEml',
    [
        body('login_id').notEmpty().withMessage('Login Id is required').isString().withMessage('Login Id must be a string.')
    ],
    async(req,res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            login_id : req.body.login_id
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/user/frgtEml`);

            const user = await mysql.select("user", "selectUserInfo", param, con);
            
            /* 아이디 존재 체크 */
            if (await calc.isEmptyObject(user)) {
                return res.json(await calc.resJson(400, '가입되어 있지 않은 이메일 입니다', null, null))
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
            return res.json(resultCode.SERVER_ERROR)
        } finally {
            await con.release();
        }
    }
)

/* ========== ============= ========== */
/* ========== 유저 비밀번호 변경 POST ========== */
/* ========== ============= ========== */
router.put('/modify', verifyToken,
    [
        body('login_id').notEmpty().withMessage('Login Id is required').isString().withMessage('Login Id must be a string.'),
        body('current_password').notEmpty().withMessage('Current Password is required').isString().withMessage('Current Password must be a string.'),
        body('new_password').notEmpty().withMessage('New Password is required').isString().withMessage('New Password must be a string.'),

    ],
    async(req,res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            login_id : req.body.login_id,
            isfirst : 0,
            current_password : req.body.current_password,
            new_password : req.body.new_password,
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/user/modify`);

            const user = await mysql.select("user", "selectUserInfo", param, con);

            /* 아이디 존재 체크 */
            if (await calc.isEmptyObject(user)) {
                return res.json(await calc.resJson(400, '아이디가 존재하지 않습니다', null, null))
            };

            /* 비밀번호 체크 */
            const userDBPassword = user.loginPw;
            const decryptPassword = await calc.decryptPassword(userDBPassword);

            if (param.current_password != decryptPassword) {
                return res.json(await calc.resJson(400, '비밀번호가 일치하지 않습니다', null, null))
            };

            const encryptNewPassword = await calc.encryptPassword(param.new_password);
            param.new_password = encryptNewPassword;

            await mysql.proc("user", "updateModify", param, con)

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
/* ========== 유저 리스트 GET ========== */
/* ========== ============= ========== */
router.get('/dvList',verifyToken, 
    [
        query('user_level').optional().isNumeric().withMessage('User Level must be a number.')
    ],
    async(req,res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            user_level : req.query.user_level
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/user/dvList`);

            const dvList = await mysql.query("user", "selectDvList", param, con)
            
            await con.commit();
            return res.json(await calc.resJson(200, 'SUCCESS', dvList, null))
        } catch(error) {
            await calc.logError('/dvList', error.message)
            await con.rollback();
            return res.json(resultCode.SERVER_ERROR)
        } finally {
            await con.release();
        }

    }
)

/* ========== ============= ========== */
/* ========== 유저 패스워드 복호화 POST ========== */
/* ========== ============= ========== */
router.post('/chPw', 
    [
        body('password').notEmpty().withMessage('Password is required').isString().withMessage('Password must be a string.')
    ],
    async(req,res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            password : req.body.password
        }

        try {
            const userPassword = await calc.decryptPassword(param.password);
            
            return res.json(await calc.resJson(200, 'SUCCESS', userPassword, null))
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