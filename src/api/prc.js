const express                             = require("express");
const verifyToken                         = require('../loaders/token').verify;
const router                              = express.Router();
const mysql                               = require("../loaders/mysql");
const upload                              = require("../loaders/multer");
const calc                                = require('../module/calc');
const db                                  = require('../config/db');
const sql                                 = require("mysql2/promise");
const dbconfig                            = require("../config/db");
const resultCode                          = require('../module/result');
const pool                                = sql.createPool(dbconfig);
const specificString                      = calc.specificString();
const { body,query, validationResult, param, check }    = require('express-validator');

require('dotenv').config()

/* ========== ============= ========== */
/* ========== 프로세스 스텝별 리스트 GET ========== */
/* ========== ============= ========== */
router.get('/prcInfo', verifyToken,
    [
        query('prj_id').notEmpty().withMessage('Project Id is required').isNumeric().withMessage('Project Id must be a number.'),
        query('version_number').notEmpty().withMessage('Version Number is required').isString().withMessage('Version Number must be a string.'),
        query('step_number').notEmpty().withMessage('Step Number is required').isNumeric().withMessage('Step Number must be a number.')
    ],
    async(req,res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            prj_id : req.query.prj_id,
            version_number : req.query.version_number,
            step_number : req.query.step_number
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/prc/prcInfo`);

            const prcInfoList = await mysql.select('prc' ,'selectPrcStepInfo', param, con);
            const prcInfoFileList = await mysql.query('prc', 'selectPrcStepInfoFile', param, con);
            const prcCommentList = await mysql.query('prc', 'selectPrcComment', param, con);

            const fileList = [];
            const commentList = [];


            if (Object.keys(prcInfoList).length !== 0) {

                if (prcInfoList.lstc_file_path != null) {
                    if(db.host == process.env.DEV_DB_HOST || db.host == process.env.PROD_DB_HOST) {
                        const newPath = prcInfoList.lstc_file_path.split('/develop')[1];
                        const data = specificString + newPath;
                    }
                }

            }

            if (param.step_number == 0) {
                let url = "";
                if (db.host == process.env.DEV_DB_HOST) {
                    url = process.env.DEV_SERVER_URL
                } else {
                    url = process.env.PROD_SERVER_URL
                }
                prcInfoList.lstc_file_path = `${url}/file/default/202409_리스트체크파일.xlsx`
                prcInfoList.lstc_file_name = '202409_리스트체크파일.xlsx'
            }

            if (prcInfoFileList.length > 0) {
                for (const i in prcInfoFileList) {
                    fileList.push(prcInfoFileList[i])
                }
                const modifiedPaths = fileList.map(item => {
                    if(db.host == process.env.DEV_DB_HOST || db.host == process.env.PROD_DB_HOST) {
                        // '/file' 이전의 부분을 제거
                        const newPath = item.file_path.split('/develop')[1];
                        // 특정 문자열과 합치기
                        return {file_id : item.prc_file_id, file_path: specificString + newPath, file_name : item.file_name };
                    } else {
                        return {
                            file_id : item.prc_file_id,
                            file_path : item.file_path,
                            file_name : item.file_name
                        }
                    }
                });
                prcInfoList.file = modifiedPaths
            }
            
            if (prcCommentList.length > 0) {
                for (const i in prcCommentList) {
                    const data = {
                        comm_id : prcCommentList[i].comm_id,
                        rgst_user_id : prcCommentList[i].rgst_user_id,
                        user_name : prcCommentList[i].user_name,
                        comment_description : prcCommentList[i].comment_description,
                        user_role : prcCommentList[i].user_role,
                        rgst_dtm : prcCommentList[i].rgst_dtm,
                        updt_dtm : prcCommentList[i].updt_dtm
                    }
                    
                    commentList.push(data);
                }
                const prcCommentFileList = await mysql.query('prc', 'selectPrcCommentFile', param, con)

                // 특정 문자열
                const modifiedPaths = prcCommentFileList.map(item => {
                    if(db.host == process.env.DEV_DB_HOST || db.host == process.env.PROD_DB_HOST) {
                        // '/file' 이전의 부분을 제거
                        const newPath = item.file_path.split('/develop')[1];
                        // 특정 문자열과 합치기
                        return { comm_file_id : item.comm_file_id, comm_id : item.comm_id, file_path: specificString + newPath, file_name : item.file_name };
                    } else {
                        return {
                            comm_file_id : item.comm_file_id,
                            comm_id : item.comm_id,
                            file_path : item.file_path,
                            file_name : item.file_name
                        }
                    }
                });

                const combined = commentList.map(comment => {
                    // 해당 comment의 comm_id에 맞는 파일들을 찾음
                    const relatedFiles = modifiedPaths.filter(file => file.comm_id === comment.comm_id);
                    // comment와 관련된 파일들을 결합
                    return {
                        ...comment,
                        files: relatedFiles.length > 0 ? relatedFiles : [] // 파일이 없을 경우 빈 배열
                    };
                });

                prcInfoList.commentList = combined;
            }

            await con.commit();
            return res.json(await calc.resJson(200, 'SUCCESS', prcInfoList, null))

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
/* ========== 프로세스 특정 버전 리스트 체크 파일 추가 POST ========== */
/* ========== ============= ========== */
router.post('/addLstc', verifyToken, upload.single('file'),
    [
        body('prj_id').notEmpty().withMessage('Project Id is required').isNumeric().withMessage('Project Id must be a number.'),
        body('version_number').notEmpty().withMessage('Version Number is required').isString().withMessage('Version Number must be a string.'),
        body('file').custom((value, { req }) => {
            if (req.file.length < 1) {
                throw new Error('File is required.');
            }
            return true; // 유효성 검사 통과
        })
    ], 
    async(req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            prj_id : req.body.prj_id,
            version_number : req.body.version_number,
            step_number : 0,
            lstc_file_path : req.file.path
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/prc/addLstc`);

            const prcInfoList = await mysql.query('prc' ,'selectPrcStepInfo', param, con)
            param.file_name = req.file.originalname
            if (prcInfoList.length < 1) {
                return res.json(await calc.resJson(400, '프로젝트 또는 프로젝트 버전이 존재하지 않습니다', null, null))
            }
            await mysql.proc('prc','updateListCheckFile', param, con);
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
/* ========== 프로세스 코멘트 추가 POST ========== */
/* ========== ============= ========== */
router.post('/addCmt', verifyToken, upload.array('files'),
    [
        body('prj_id').notEmpty().withMessage('Project ID is required.').isNumeric().withMessage('Project ID must be a number.'),
        body('version_number').notEmpty().withMessage('Version number is required.').isString().withMessage('Version number must be a string.'),
        body('step_number').notEmpty().withMessage('Step Number is required.').isNumeric().withMessage('Step Number must be a number'),
        body('rgst_user_id').notEmpty().withMessage('Regist User ID is required.').isNumeric().withMessage('Regist User ID must be a number.'),
        body('comment_description').notEmpty().withMessage('Comment Description is required').isString().withMessage('Comment Description must be a string'),
    ], 
    async(req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            prj_id : req.body.prj_id,
            version_number : req.body.version_number,
            step_number : req.body.step_number,
            rgst_user_id : req.body.rgst_user_id,
            comment_description : req.body.comment_description,
            file : typeof req.files == "undefined" ? null : req.files
        }

        const to_email_id = [];

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/prc/addCmt`);

            const prjlist = await mysql.query('prj', 'selectPrjVersion', param, con);
    
            if (prjlist.length < 1) {
                return res.json(await calc.resJson(400, '프로젝트 또는 프로젝트 버전이 존재하지 않습니다', null, null))
            }

            param.comm_id = await mysql.value('prc', 'nextvalId', {id : 'comm_id'}, con);
            await mysql.proc('prc', 'insertPrcComment', param, con);

            for (const i in param.file) {

                const comm_file_id = await mysql.value('prc', 'nextvalId', {id : 'comm_file_id'}, con);
                const data = {
                    comm_file_id : comm_file_id,
                    comm_id : param.comm_id,
                    file_path : param.file[i].path,
                    file_name : param.file[i].originalname
                };

                await mysql.proc('prc', 'insertPrcCommentFile', data, con);
            }

            const prjSecUserList = await mysql.query('prc', 'selectPrjSecManageList', param, con);
            const prjDevUserList = await mysql.query('prc', 'selectPrjDecManageList', param, con);

            for (const i in prjSecUserList) {
                if (prjSecUserList[i].sec_id == param.rgst_user_id) {
                    continue;
                }
                to_email_id.push(prjSecUserList[i].sec_id)
            }

            for (const i in prjDevUserList) {
                if (prjDevUserList[i].dev_id == param.rgst_user_id) {
                    continue;
                }
                to_email_id.push(prjDevUserList[i].dev_id)
            }

            param.email_to_array = to_email_id;
            const userEmail = await mysql.query('prc', 'selectUserEmail', param, con);
            const mailOption = '[' + prjlist[0].prj_name + ']' + ' ' + '[' +prjlist[0].version_number + ']' + '의 코멘트가 등록 되었습니다.';;
            /* 이메일 전송  */
            await calc.toEmail(userEmail, 'D', mailOption)
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
/* ========== 프로세스 코멘트 수정 PUT ========== */
/* ========== ============= ========== */
router.put('/updtCmt', verifyToken, upload.array('files'),
    [
        body('comm_id').notEmpty().withMessage('Comment Id is required.').isNumeric().withMessage('Comment Id must be a number.'),
        body('comment_description').optional().isString().withMessage('Comment Description must be a string.'),
    ],  
    async(req, res) => {
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            comm_id : req.body.comm_id,
            comment_description : req.body.comment_description,
            file : typeof req.files == "undefined" ? null : req.files
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/prc/updtCmt`);

            const commentList = await mysql.query('prc', 'selectPrcCommentList', param, con);

            if(commentList.length < 1) {
                return res.json(await calc.resJson(400, '코멘트가 존재하지 않습니다', null, null))
            }

            if (param.comment_description != undefined) {
                // 코멘트 내용 수정
                await mysql.proc('prc', 'updatePrcComment', param, con);
            }

            if (param.file.length > 0) {
                await mysql.proc('prc', 'deletePrcCommentFile', param, con);
                for (const i in param.file) {
                    const comm_file_id = await mysql.value('prc', 'nextvalId', {id : 'comm_file_id'}, con);
                    const data = {
                        comm_file_id : comm_file_id,
                        comm_id : param.comm_id,
                        file_path : param.file[i].path,
                        file_name : param.file[i].originalname
                    };
                    // console.log(data);
                    await mysql.proc('prc', 'insertPrcCommentFile', data, con);
                }
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
/* ========== 프로세스 코멘트 삭제 DELETE ========== */
/* ========== ============= ========== */
router.delete('/delCmt', verifyToken, 
    [
        body('comm_id').notEmpty().withMessage('Comment Id is required.').isNumeric().withMessage('Comment Id must be a number.'),
    ],
    async(req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }
    
        var param = {
            comm_id : req.body.comm_id
        }
        
        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/prc/delCmt`);

            const commentList = await mysql.query('prc', 'selectPrcCommentList', param, con);
            
            if(commentList.length < 1) {
                return res.json(await calc.resJson(400, '코멘트가 존재하지 않습니다 코멘트 번호를 다시 입력해 주세요', null, null))
            }

            await mysql.proc('prc', 'deletePrcComment', param, con)
            await mysql.proc('prc', 'deletePrcCommentFile', param, con)
            
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
/* ========== 프로세스 최종정보 등록 PSOT ========== */
/* ========== ============= ========== */
router.post('/lstnRgst', verifyToken, upload.array('files'),
    [
        body('prj_id').notEmpty().withMessage('Project Id is required.').isNumeric().withMessage('Project Id must be a number.'),
        body('version_number').notEmpty().withMessage('Version Number is required.').isString().withMessage('Version Number must be a string.'),
        body('step_number').notEmpty().withMessage('Step Number is required.').isNumeric().withMessage('Step Number must be a number.'),
        body('step_lnk').notEmpty().withMessage('Step link is required').isURL().withMessage('Step link is must be a URL'),
        body('step_description').notEmpty().withMessage('Step Description is required.').isString().withMessage('Step Description must be a string.'),
        body('rgst_user_id').notEmpty().withMessage('Regist User ID is required.').isNumeric().withMessage('Regist User ID must be a number.'),
        body('files').custom((value, { req }) => {
            if (req.files.length < 1) {
                throw new Error('File is required.');
            }
            return true; // 유효성 검사 통과
        })
    ],
    async(req,res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }
    
        var param = {
            prj_id : req.body.prj_id,
            version_number : req.body.version_number,
            step_number : req.body.step_number,
            step_lnk : req.body.step_lnk,
            step_description : req.body.step_description,
            rgst_user_id : req.body.rgst_user_id,
            file : typeof req.files == "undefined" ? null : req.files
        }

        const to_email_id = [];

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/prc/lstnRgst`);

            const prcStepList = await mysql.query('prc', 'selectPrcStepInfo', param, con);

            const prjlist = await mysql.query('prj', 'selectPrjVersion', param, con);

            if (prjlist.length < 1) {
                return res.json(await calc.resJson(400, '프로젝트 또는 프로젝트 버전이 존재하지 않습니다', null, null))
            }

            if (prcStepList.length < 1) {
                param.prc_id = await mysql.value('prc', 'nextvalId', {id : 'prc_id'}, con);
                await mysql.proc('prc', 'insertPrcStepInfo', param, con);
            }

            param.prc_id = await mysql.value('prc', 'nextvalId', {id : 'prc_id'}, con);
            await mysql.proc('prc', 'updatePrcStepInfo', param, con);

            if(param.file.length > 0) {
                await mysql.proc('prc', 'deletePrcStepInfoFile', param, con);
                for (const i in param.file) {
                    const prc_file_id = await mysql.value('prc', 'nextvalId', {id : 'prc_file_id'}, con);
                    const data = {
                        prc_file_id : prc_file_id,
                        prj_id : param.prj_id,
                        version_number : param.version_number,
                        step_number : param.step_number,
                        file_path : param.file[i].path,
                        file_name : param.file[i].originalname
                    };
        
                    await mysql.proc('prj', 'insertPrcStepInfoFile', data, con);
                }
            }

            const prjSecUserList = await mysql.query('prc', 'selectPrjSecManageList', param, con);
            const prjDevUserList = await mysql.query('prc', 'selectPrjDecManageList', param, con);
            
            for (const i in prjSecUserList) {
                if (prjSecUserList[i].sec_id == param.rgst_user_id) {
                    continue;
                }
                to_email_id.push(prjSecUserList[i].sec_id)
            }

            for (const i in prjDevUserList) {
                if (prjDevUserList[i].dev_id == param.rgst_user_id) {
                    continue;
                }
                to_email_id.push(prjDevUserList[i].dev_id)
            }

            param.email_to_array = to_email_id;
            const userEmail = await mysql.query('prc', 'selectUserEmail', param, con);
            const mailOption = '[' + prjlist[0].prj_name + ']' + ' ' + '[' +prjlist[0].version_number + ']' + '의 최종정보 항목이 등록 되었습니다.';
            /* 이메일 전송  */
            await calc.toEmail(userEmail, 'D', mailOption)
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


module.exports = router;