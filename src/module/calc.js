const nodemailer                    = require('nodemailer');
const db                            = require('../config/db');
const logger                        = require('../config/logger');
const cryptojs                      = require('crypto');

require('dotenv').config();

// 이메일 인증 Function
exports.emailAuthSend = async function(to, option) {
    // /* 회원가입 이메일 전송을 위한 계정 세팅 */
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    try {
        await transporter.sendMail({
            from : 'yagsill@dasvers.com',
            to : to,
            subject : '[DAS SDL 회원가입 인증 코드] 알림이 도착했습니다',
            text : 'DAS SDL 회원가입 인증 코드입니다. : ' + option
        })
        return result = {
            resultCode : 200,
            resultMsg : '회원가입 인증 요청 이메일 전송 성공',
            data : option
        }
    } catch (error) {
        return result = {
            resultCode : 401,
            resultMsg : error
        }
    }

}

const emailSend = async function(to, type, option) {

    // /* 회원가입 이메일 전송을 위한 계정 세팅 */
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const password = randomPassword()

    /* 회원가입 이메일 전송 function */
    if (type == 'N') {
        try {
            await transporter.sendMail({
                from : 'yagsill@dasvers.com',
                to : to,
                subject : '[DAS SDL 이메일 인증] 알림이 도착했습니다',
                text : 'DAS SDL 이메일 인증 비밀번호 입니다 : ' + password
            })
            return result = {
                resultCode : 200,
                resultMsg : 'success',
                data : password
            }
        } catch (error) {
            return result = {
                resultCode : 401,
                resultMsg : error
            }
        }
    }
    /* 비밀번호 찾기 전송 function */
    if (type == 'F') {
        try {
            await transporter.sendMail({
                from : 'yagsill@dasvers.com',
                to : to,
                subject : '[DAS SDL 비밀번호 확인] 알림이 도착했습니다',
                text : 'DAS SDL 현재 비밀번호 입니다 : ' + option
            })
            return result = {
                resultCode : 200,
                resultMsg : 'success',
                data : option
            }
        } catch (error) {
            return result = {
                resultCode : 401,
                resultMsg : error
            }
        }
    }
    /* 코멘트 등록 전송 function */
    if (type == 'D') {
        try {
            for (const i in to) {
                await transporter.sendMail({
                    from : 'yagsill@dasvers.com',
                    to : to[i].login_id,
                    subject : '[DAS SDL] 알림이 도착했습니다',
                    text : 'DAS SDL ' + option
                })
            }
            return result = {
                resultCode : 200,
                resultMsg : 'success',
                data : option
            }
        } catch(error) {
            return result = {
                resultCode : 401,
                resultMsg : error
            }
        }
    }
};

exports.toEmail = async function (userEmail, type, option) {

    emailSend(userEmail, type, option).then((response) => {
        if (response.resultCode == 200) {
            console.log('Email Send Success')
        } else {
            console.log('Email Send Fail')
        }
    })
}

/* 패스워드 랜덤 조합 */
function randomPassword() {

    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charLength = chars.length;
    let result = '';
    for ( var i = 0; i < charLength; i++ ) {
        result += chars.charAt(Math.floor(Math.random() * charLength));
    }

    return result;

}

/* 이메일 인증 코드 */
exports.createEmailAuthCode = async function() {

    const str = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const strLength = str.length;
    let result = '';
    
    for ( var i = 0; i < 6; i++ ) {
        result += str.charAt(Math.floor(Math.random() * strLength));
    }

    return result;

}

const algorithm = process.env.CRYPTO;
const key = cryptojs.scryptSync(process.env.ENCRYPT_KEY, 'specialSalt', 32);
// const iv = cryptojs.randomBytes(16);
const iv = process.env.ENCRYPT_IV;

/* 비밀번호 암호화 */
exports.encryptPassword = async function(password) {
    const cipher = cryptojs.createCipheriv(algorithm,key,iv);
    let result = cipher.update(password, 'utf8', 'base64');
    result += cipher.final('base64');
    return result;
}
  
/* 비밀번호 복호화 */
exports.decryptPassword = async function(password) {
    const decipher = cryptojs.createDecipheriv(algorithm, key, iv);
    let result = decipher.update(password, 'base64', 'utf8');
    result += decipher.final('utf8');
    return result;
}

/* DB 호스트 확인 */
exports.specificString = function() {
    if (db.host == process.env.PROD_DB_HOST) {
        return process.env.PROD_SERVER_URL
    } else if (db.host == process.env.DEV_DB_HOST) {
        return process.env.DEV_SERVER_URL
    }
}

exports.logInfo = async function(label, data) {
    logger.info(`===== ${label} : `, { message: JSON.stringify(data, null, 2) });
}

exports.logError = async function(label, data) {
    logger.error(`===== ${label} : `, { message: JSON.stringify(data, null, 2) });
}

exports.isEmptyObject = async function(param) {
    return Object.keys(param).length === 0 && param.constructor === Object;
}

exports.resJson = async function(resultCode, resultMsg, data, token) {

    var result = {
        resultCode : resultCode,
        resultMsg : resultMsg
    }

    if (data != null) {
        result.data = data
    }

    if (token != null) {
        result.token = token
    }

    await this.logInfo('Data', result)

    return result
}
