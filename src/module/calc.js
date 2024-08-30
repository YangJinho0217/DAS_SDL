const nodemailer = require('nodemailer');
const cryptojs = require('crypto');
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
            subject : 'DAS SDL 회원가입 인증요청이 있습니다.',
            text : 'DAS SDL 회원가입 인증 코드입니다. : ' + option
        })
        
        const result = {
            resultCode : 200,
            resultMsg : '회원가입 인증 요청 이메일 전송 성공',
            data : option
        }

        return result;

    } catch (error) {
        const result = {
            resultCode : 401,
            resultMsg : error
        }
        return result;
    }

}

/* 이메일 보내기 / 이메일 재전송 Function
    to : 이메일 받는 유저
    type : 이메일 타입 
        N = 회원가입 시 전송
        F = 이메일 재전송
    option : 이메일 재전송 시 DB에 있는 값
*/

exports.emailSend = async function(to, type, option) {

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
                subject : 'DAS SDL 이메일 인증',
                text : 'DAS SDL 이메일 인증 비밀번호 입니다 : ' + password
            })
            
            const result = {
                resultCode : 200,
                resultMsg : 'success',
                data : password
            }
    
            return result;
    
        } catch (error) {
            const result = {
                resultCode : 401,
                resultMsg : error
            }
            return result;
        }
    }
    
    if (type == 'F') {

        try {

            await transporter.sendMail({
                from : 'yagsill@dasvers.com',
                to : to,
                subject : 'DAS SDL 비밀번호 찾기',
                text : 'DAS SDL 비밀번호 찾기 입니다. 현재 비밀번호 : ' + option
            })
            
            const result = {
                resultCode : 200,
                resultMsg : 'success',
                data : option
            }
    
            return result;
    
        } catch (error) {
            const result = {
                resultCode : 401,
                resultMsg : error
            }
            return result;
        }
    }

};

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

