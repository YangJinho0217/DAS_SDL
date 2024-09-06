const express                             = require("express");
const verifyToken                         = require('../loaders/token').verify;
const router                              = express.Router();
const mysql                               = require("../loaders/mysql");
const upload                              = require("../loaders/multer");
const db                                  = require('../config/db');
const sql                                 = require("mysql2/promise");
const dbconfig                            = require("../config/db");
const calc                                = require('../module/calc');
const resultCode                          = require('../module/result');
const pool                                = sql.createPool(dbconfig);
const specificString                      = calc.specificString();
const { body,query, validationResult }    = require('express-validator');

require('dotenv').config()

/* ========== ============= ========== */
/* ========== 프로젝트 생성 POST ========== */
/* ========== ============= ========== */
router.post('/ctPrj', verifyToken, upload.array('files'), 
    [
        body('prj_name').notEmpty().withMessage('Project Name is required.').isString().withMessage('Project Name must be a string.'),
        body('prj_description').notEmpty().withMessage('Project Description is required.').isString().withMessage('Project Description must be a string'),
        body('prj_start_version').notEmpty().withMessage('Project Start Version number is required.').isString().withMessage('Project Start Version number must be a string.'),
        body('rgst_user_id').notEmpty().withMessage('Rgst User Id is required.').isNumeric().withMessage('Rgst user Id must be a number.'),
        body('prj_lnk').notEmpty().withMessage('Project link is required').isURL().withMessage('Project link is must be a URL'),
        body('prj_sec_user').notEmpty().withMessage('Project Security user is required').isString().withMessage('Security user must be an array of numbers.'),
        body('prj_dev_user').notEmpty().withMessage('Project Develop user is required').isString().withMessage('Developer user must be an array of numbers.'),
        body('files').custom((value, { req }) => {
            if (req.files.length < 1) {
                throw new Error('File is required.');
            }
            return true; // 유효성 검사 통과
        })
    ],
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            prj_name : req.body.prj_name,
            prj_description : req.body.prj_description,
            prj_start_version : req.body.prj_start_version,
            rgst_user_id : req.body.rgst_user_id,
            prj_sec_user : req.body.prj_sec_user,
            prj_dev_user : req.body.prj_dev_user,
            prj_lnk : req.body.prj_lnk,
            step_file : typeof req.files == "undefined" ? null : req.files
        };

        const secUser = param.prj_sec_user.split(',');
        const devUser = param.prj_dev_user.split(',');

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();
            await calc.logInfo('Interface', `${specificString}/das/prj/ctPrj`)
            param.prj_id = await mysql.value('prj', 'nextvalId', {id : 'prj_id'}, con);
            param.version_id = await mysql.value('prj', 'nextvalId', {id : 'version_id'}, con);
            param.step_id = await mysql.value('prj', 'nextvalId', {id : 'step_id'}, con);
            param.version_number = param.prj_start_version;
            param.step_number = 0;
            param.step_status = 'W';
            param.step_lnk = param.prj_lnk;
            param.step_description = param.prj_description;
            // project_security_manager 테이블 insert
            for (var i = 0; i < secUser.length; i ++) {

                const data = {
                    prj_sec_id : await mysql.value('prj', 'nextvalId', {id : 'prj_sec_id'}, con),
                    prj_id : param.prj_id,
                    version_number : param.version_number,
                    sec_id : secUser[i]
                };
                await mysql.proc('prj', 'insertPrjSecManager', data, con);
            }

            // project_develop_manager 테이블 insert
            for (var i = 0; i < devUser.length; i++) {

                const data = {
                    prj_dev_id : await mysql.value('prj', 'nextvalId', {id : 'prj_dev_id'}, con),
                    prj_id : param.prj_id,
                    version_number : param.version_number,
                    dev_id : devUser[i]
                };

                await mysql.proc('prj', 'insertPrjDevManager', data, con);
            }

            for (var i = 0; i < param.step_file.length; i++) {

                const file_id = await mysql.value('prj', 'nextvalId', {id : 'file_id'}, con);
                const data = {
                    file_id : file_id,
                    prj_id : param.prj_id,
                    step_number : param.step_number,
                    version_number : param.version_number,
                    file_path : param.step_file[i].path,
                    file_name : param.step_file[i].originalname
                };

                await mysql.proc('prj', 'insertPrjFile', data, con);
            }

            // project 테이블에 insert
            await mysql.proc('prj', 'insertPrj', param, con);

            // project_version 테이블에 insert
            await mysql.proc('prj', 'insertPrjVersion', param, con);

            // project_step 테이블에 insert
            await mysql.proc('prj', 'insertPrjStepCreate', param, con);

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
/* ========== 프로젝트 버전 생성 POST ========== */
/* ========== ============= ========== */
router.post('/addPrjVer', verifyToken, upload.array('files'),
    [
        body('prj_id').notEmpty().withMessage('Project ID is required.').isNumeric().withMessage('Project ID must be a number.'),
        body('prj_name').notEmpty().withMessage('Project Name is required.').isString().withMessage('Project Name must be a string.'),
        body('prj_description').notEmpty().withMessage('Project Description is required.').isString().withMessage('Project Description must be a string'),
        body('version_number').notEmpty().withMessage('Version number is required.').isString().withMessage('Version number must be a string.'),
        body('rgst_user_id').notEmpty().withMessage('Rgst User Id is required.').isNumeric().withMessage('Rgst user Id must be a number.'),
        body('prj_lnk').notEmpty().withMessage('Project link is required').isURL().withMessage('Project link is must be a URL'),
        body('prj_sec_user').notEmpty().withMessage('Project Security user is required').isString().withMessage('Security user must be an array of numbers.'),
        body('prj_dev_user').notEmpty().withMessage('Project Develop user is required').isString().withMessage('Developer user must be an array of numbers.'),
        body('files').custom((value, { req }) => {
            if (req.files.length < 1) {
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
            prj_name : req.body.prj_name,
            prj_description : req.body.prj_description,
            version_number : req.body.version_number,
            rgst_user_id : req.body.rgst_user_id,
            prj_sec_user : req.body.prj_sec_user,
            prj_dev_user : req.body.prj_dev_user,
            prj_lnk :  req.body.prj_lnk,
            step_file : typeof req.files == "undefined" ? null : req.files
        }

        const secUser = param.prj_sec_user.split(',');
        const devUser = param.prj_dev_user.split(',');

        const con = await pool.getConnection();
        try {
            await calc.logInfo('Interface', `${specificString}/das/prj/addPrjVer`)
            await con.beginTransaction();
            const prj = await mysql.query('prj', 'selectPrj', param, con);
            const version = await mysql.query('prj', 'selectPrjVersion', param, con);
        
            if (prj.length < 1) {
                return res.json(await calc.resJson(400, '프로젝트가 존재하지 않습니다', null, null))
            }
        
            if (version.length > 0) {
                return res.json(await calc.resJson(400, '해당 버전이 존재합니다', null, null))
            }

            param.version_id = await mysql.value('prj', 'nextvalId', {id : 'version_id'}, con);
            param.step_id = await mysql.value('prj', 'nextvalId', {id : 'step_id'}, con);
            param.step_number = 0;
            param.step_status = 'W';
            param.step_lnk = param.prj_lnk;
            param.step_description = param.prj_description;

            // project_security_manager 테이블 insert
            for (var i = 0; i < secUser.length; i ++) {

                const data = {
                    prj_sec_id : await mysql.value('prj', 'nextvalId', {id : 'prj_sec_id'}, con),
                    prj_id : param.prj_id,
                    version_number : param.version_number,
                    sec_id : secUser[i]
                };
                await mysql.proc('prj', 'insertPrjSecManager', data, con);
            }

            // project_develop_manager 테이블 insert
            for (var i = 0; i < devUser.length; i++) {

                const data = {
                    prj_dev_id : await mysql.value('prj', 'nextvalId', {id : 'prj_dev_id'}, con),
                    prj_id : param.prj_id,
                    version_number : param.version_number,
                    dev_id : devUser[i]
                };

                await mysql.proc('prj', 'insertPrjDevManager', data, con);
            }

            for (var i = 0; i < param.step_file.length; i++) {

                const file_id = await mysql.value('prj', 'nextvalId', {id : 'file_id'}, con);

                const data = {
                    file_id : file_id,
                    prj_id : param.prj_id,
                    step_number : param.step_number,
                    version_number : param.version_number,
                    file_path : param.step_file[i].path,
                    file_name : param.step_file[i].originalname
                };

                await mysql.proc('prj', 'insertPrjFile', data, con);
            }

            // project_version 테이블에 insert
            await mysql.proc('prj', 'insertPrjVersion', param, con);

            // project_step 테이블에 insert
            await mysql.proc('prj', 'insertPrjStepCreate', param, con);


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
/* ========== 프로젝트 리스트 GET ========== */
/* ========== ============= ========== */
router.get('/prjList',verifyToken,
    [
        query('user_id').optional().isNumeric().withMessage('User ID must be a number.'),
    ],
    async(req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            user_id : req.query.user_id
        };

        const con = await pool.getConnection();
        try {
            await con.beginTransaction();
            await calc.logInfo('Interface', `${specificString}/das/prj/prjList`)
            const myProjectList = await mysql.query('prj', 'selectPrjAll', param, con);
            const myProjectListDevUser = await mysql.query('prj', 'selectPrjDevUser', param, con);
            const myProjectListSecUser = await mysql.query('prj', 'selectPrjSecUser', param, con);

            const combinedProjectList = myProjectList.map(prj => {
                const devUser = myProjectListDevUser.find(dev => dev.prj_id === prj.prj_id && dev.version_number === prj.version_number);
                const secUser = myProjectListSecUser.find(sec => sec.prj_id === prj.prj_id && sec.version_number === prj.version_number);
                
                const dev_ids = devUser ? devUser.dev_ids.split(',') : [];
                const sec_ids = secUser ? secUser.sec_ids.split(',') : [];
                
                const user_id = param.user_id; // user_id를 param에서 가져옴

                // user_id가 정의되지 않은 경우 전체 프로젝트 정보를 반환
                if (user_id === undefined || user_id === "undefined") {
                    return {
                        prj_id: prj.prj_id,
                        prj_name: prj.prj_name,
                        prj_description: prj.prj_description,
                        prj_lnk : prj.prj_lnk,
                        version_number: prj.version_number,
                        rgst_user_id : prj.rgst_user_id,
                        rgst_user_name : prj.user_name,
                        step_number: prj.step_number,
                        step_status: prj.step_status,
                        rgst_dtm : prj.rgst_dtm,
                        updt_dtm : prj.updt_dtm,
                        dev_ids: dev_ids.length > 0 ? devUser.dev_ids : undefined,
                        dev_user_name: dev_ids.length > 0 ? devUser.user_name : undefined,
                        sec_ids: sec_ids.length > 0 ? secUser.sec_ids : undefined,
                        sec_user_name: sec_ids.length > 0 ? secUser.user_name : undefined
                    };
                }
            
                // user_id가 정의된 경우
                const isUserIdMatch = (dev_ids.includes(user_id) || sec_ids.includes(user_id));

                const result = {
                    prj_id: prj.prj_id,
                    prj_name: prj.prj_name,
                    prj_description: prj.prj_description,
                    prj_lnk : prj.prj_lnk,
                    version_number: prj.version_number,
                    rgst_user_id : prj.rgst_user_id,
                    rgst_user_name : prj.user_name,
                    step_number: prj.step_number,
                    step_status: prj.step_status,
                    rgst_dtm : prj.rgst_dtm,
                    updt_dtm : prj.updt_dtm,
                    dev_ids: dev_ids.length > 0 ? devUser.dev_ids : undefined,
                    dev_user_name: dev_ids.length > 0 ? devUser.user_name : undefined,
                    sec_ids: sec_ids.length > 0 ? secUser.sec_ids : undefined,
                    sec_user_name: sec_ids.length > 0 ? secUser.user_name : undefined
                };
            
                // 조건에 맞는 경우에만 결과를 반환
                return isUserIdMatch ? result : null;
            
            }).filter(item => item !== null);

            await con.commit();
            return res.json(await calc.resJson(200, 'SUCCESS', combinedProjectList, null))
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
/* ========== 프로젝트 상세 조회 ========== */
/* ========== ============= ========== */
router.get('/detail', verifyToken,
    [
        query('prj_id').notEmpty().withMessage('Project ID is required.').isNumeric().withMessage('Project ID must be a number.'),
        query('version_number').notEmpty().withMessage('Version Number Value is required.').isString().withMessage('Version Number Value must be a string.')
    ], 
    async(req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }
    
        var param = {
            prj_id : req.query.prj_id,
            version_number : req.query.version_number
        }
        
        const con = await pool.getConnection();
        try {
            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/prj/detail`)
            const value = await mysql.select('prj', 'selectPrjVersionDetail', param, con);
            const myProjectListDevUser = await mysql.query('prj', 'selectPrjDevUser', param, con);
            const myProjectListSecUser = await mysql.query('prj', 'selectPrjSecUser', param, con);
            const myProjectListFile = await mysql.query('prj', 'selectPrjFile', param, con);


            if (value.del_yn != 'Y') {
                return res.json(await calc.resJson(400, '버전이 없습니다', null, null))
            }
            const modifiedPaths = myProjectListFile.map(item => {

                if(db.host == process.env.DEV_DB_HOST || db.host == process.env.PROD_DB_HOST) {
                    // '/file' 이전의 부분을 제거
                    const newPath = item.file_path.split('/develop')[1];
                    // 특정 문자열과 합치기
                    return { file_id : item.file_id, file_path: specificString + newPath, file_name : item.file_name };
                } else {
                    return {
                        file_id : item.file_id,
                        file_path : item.file_path,
                        file_name : item.file_name
                    }
                }
                
            });
            
            const devUser = myProjectListDevUser.find(dev => dev.prj_id === value.prj_id && dev.version_number === value.version_number);
            const secUser = myProjectListSecUser.find(sec => sec.prj_id === value.prj_id && sec.version_number === value.version_number);

            value.sec_user = secUser.sec_ids
            value.sec_user_name = secUser.user_name
            value.dev_user_id = devUser.dev_ids
            value.dev_user_name = devUser.user_name
            value.file = modifiedPaths
            
            await con.commit();
            return res.json(await calc.resJson(200, 'SUCCESS', value, null))
        } catch(error) {
            console.log(error)
            await con.rollback();
            return res.json(resultCode.SERVER_ERROR)
        } finally {
            await con.release();
        }
        
    }
)

router.get('/lstVer',
    [
        query('prj_id').notEmpty().withMessage('Project ID is required.').isNumeric().withMessage('Project ID must be a number.'),
    ],
    async(req,res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }
    
        var param = {
            prj_id : req.query.prj_id
        }

        const con = await pool.getConnection();
        try {
            await con.beginTransaction();
            await calc.logInfo('interface', `${specificString}/das/prj/lstVer`)
            const lstVer = await mysql.select('prj', 'selectPrjLastVersion', param, con);

            await con.commit();
            return res.json(await calc.resJson(200, 'SUCCESS', lstVer, null))
        } catch(error) {
            await con.rollback();
            return res.json(resultCode.SERVER_ERROR)
        } finally {
            await con.release();
        }
    }
)

/* ========== ============= ========== */
/* ========== 특정 프로젝트 히스토리 GET ========== */
/* ========== ============= ========== */
router.get('/prjHst', verifyToken,
    [
        query('prj_id').notEmpty().withMessage('Project ID is required.').isNumeric().withMessage('Project ID must be a number.')
    ], 
    async(req,res) => {
    
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            prj_id : req.query.prj_id
        };

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/prj/prjHst`)
            const myProjectList = await mysql.query('prj', 'selectPrjHistory', param, con);
            const myProjectListDevUser = await mysql.query('prj', 'selectPrjDevUser', param, con);
            const myProjectListSecUser = await mysql.query('prj', 'selectPrjSecUser', param, con);

            // 결과를 저장할 배열
            const combinedProjectList = myProjectList.map(prj => {
                // 개발자 및 보안 사용자 정보를 찾기
                const devUser = myProjectListDevUser.find(dev => dev.prj_id === prj.prj_id && dev.version_number === prj.version_number);
                const secUser = myProjectListSecUser.find(sec => sec.prj_id === prj.prj_id && sec.version_number === prj.version_number);
                
                // // 결과 객체 생성
                return {
                    prj_id: prj.prj_id,
                    prj_name: prj.prj_name,
                    prj_description: prj.prj_description,
                    version_number: prj.version_number,
                    rgst_user_id : prj.rgst_user_id,
                    del_yn : prj.del_yn,
                    rgst_user_name : prj.user_name,
                    step_number: prj.step_number,
                    step_status: prj.step_status,
                    rgst_dtm : prj.rgst_dtm,
                    updt_dtm : prj.updt_dtm,
                    dev_ids: devUser ? devUser.dev_ids : null, // 개발자 ID
                    dev_user_name : devUser ? devUser.user_name : null,
                    sec_ids: secUser ? secUser.sec_ids : null,  // 보안 사용자 ID
                    sec_user_name : secUser ? secUser.user_name : null
                };
            });

            await con.commit();
            return res.json(await calc.resJson(200, 'SUCCESS', combinedProjectList, null))

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
/* ========== 프로젝트 특정 버전 수정 PUT ========== */
/* ========== ============= ========== */
router.put('/updtPrj', verifyToken, upload.array('files'),
    [
        body('prj_id').notEmpty().withMessage('Project ID is required.').isNumeric().withMessage('Project ID must be a number.'),
        body('updt_user_id').notEmpty().withMessage('Updater User ID is required.').isNumeric().withMessage('Updater User ID must be a number.'),
        body('version_number').notEmpty().withMessage('Version number is required.').isString().withMessage('Version number must be a string.'),
        body('del_yn').optional().isIn(['Y', 'N']).withMessage('Delete flag must be Y or N.'),
        body('prj_name').optional().isString().withMessage('Project name must be a string.'),
        body('prj_description').optional().isString().withMessage('Project description must be a string.'),
        body('prj_lnk').optional().isURL().withMessage('Project link must be a valid URL.'),
        body('prj_sec_user').optional().isString().withMessage('Security user must be an array of numbers.'),
        body('prj_dev_user').optional().isString().withMessage('Developer user must be an array of numbers.'),
    ],
    async(req, res) => {

        // 유효성 검사 결과 확인
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            prj_id : req.body.prj_id,
            updt_user_id : req.body.updt_user_id,
            version_number : req.body.version_number,
            del_yn : req.body.del_yn,
            prj_name : req.body.prj_name,
            prj_description : req.body.prj_description,
            prj_lnk : req.body.prj_lnk,
            prj_sec_user : req.body.prj_sec_user,
            prj_dev_user : req.body.prj_dev_user,
            del_file_id : req.body.del_file_id,
            step_file : typeof req.files == "undefined" ? null : req.files
        }

        const con = await pool.getConnection();
        try {

            await con.beginTransaction();
            await calc.logInfo('Interface', `${specificString}/das/prj/updtPrj`)
            // 버전 변경 불가
            const projectList = await mysql.query('prj','selectPrjVersion', param, con);
            if (projectList.length < 1) {
                return res.json(await calc.resJson(400, '프로젝트 또는 버전이 존재하지 않습니다', null, null))
            }
            
            await mysql.proc('prj', 'updatePrjVersion', param, con);

            if (param.prj_sec_user != undefined) {
                const secUser = param.prj_sec_user.split(',');
                await mysql.proc('prj', 'deletePrjSecManager', param, con);
                // project_security_manager 테이블 insert
                for (var i = 0; i < secUser.length; i ++) {
                    const data = {
                        prj_sec_id : await mysql.value('prj', 'nextvalId', {id : 'prj_sec_id'}, con),
                        prj_id : param.prj_id,
                        version_number : param.version_number,
                        sec_id : secUser[i]
                    };
                    await mysql.proc('prj', 'insertPrjSecManager', data, con);
                }
            }

            if (param.prj_dev_user != undefined) {
                const devUser = param.prj_dev_user.split(',');
                await mysql.proc('prj', 'deletePrjDevManager', param, con);
                // project_develop_manager 테이블 insert
                for (var i = 0; i < devUser.length; i++) {
                    const data = {
                        prj_dev_id : await mysql.value('prj', 'nextvalId', {id : 'prj_dev_id'}, con),
                        prj_id : param.prj_id,
                        version_number : param.version_number,
                        dev_id : devUser[i]
                    };
                    await mysql.proc('prj', 'insertPrjDevManager', data, con);
                }
            }

            if (param.step_file.length > 0) {
                await mysql.proc('prj', 'deletePrjFile', param, con);
                for (var i = 0; i < param.step_file.length; i++) {
                    const file_id = await mysql.value('prj', 'nextvalId', {id : 'file_id'}, con);
                    const data = {
                        file_id : file_id,
                        prj_id : param.prj_id,
                        version_number : param.version_number,
                        file_path : param.step_file[i].path,
                        file_name : param.step_file[i].originalname
                    };
                    await mysql.proc('prj', 'insertPrjFile', data, con);
                }   
            }

            await con.commit();
            return res.json(await calc.resJson(200, 'SUCCESS', null, null))

        } catch (error) {
            console.log(error)
            await con.rollback();
            return res.json(resultCode.SERVER_ERROR)
        } finally {
            await con.release();
        }
    }
)

router.post('/agrStp', verifyToken,
    [
        body('step_id').notEmpty().withMessage('Step ID is required.').isNumeric().withMessage('Step ID must be a number.')
    ], 
    async(req,res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(await calc.resJson(400, errors.array(), null, null))
        }

        var param = {
            step_id : req.body.step_id,
        }
        const con = await pool.getConnection();
        try {

            await con.beginTransaction();

            await calc.logInfo('Interface', `${specificString}/das/prj/agrStp`)
            const prjStepList = await mysql.query('prj', 'selectPrjStep', param, con);

            if(prjStepList.length < 1) {
                return res.json(await calc.resJson(400, '프로젝트의 스텝아이디가 존재하지 않습니다', null, null))
            };

            param.prj_id = prjStepList[0].prj_id;
            param.version_number = prjStepList[0].version_number;
            if (prjStepList[0].step_number >= 4) {
                return res.json(await calc.resJson(400, '스텝 넘버가 잘못되었습니다' + ' ' + '현재 : ' + prjStepList[0].step_number, null, null))
            }
            param.updt_step_number = prjStepList[0].step_number + 1;

            await mysql.proc('prj', 'updatePrjStep', param, con);

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