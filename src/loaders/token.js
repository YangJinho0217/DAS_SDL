const jwt                           = require('jsonwebtoken')
const calc                          = require('../module/calc');
const secretKey                     = require('../config/jwt').key;

const token = {
    create : (user) => {
        var token = null
        try {
            token = jwt.sign({user}, secretKey, {
                // expiresIn : '1m'
            })
            calc.logInfo('token', token)
        } catch(err) {
            calc.logError('token', err)
        }
        return token
    },
    verify : (req, res, next) => {
        try {
            var decoded = jwt.verify(req.headers.token, secretKey)
            global.user = decoded.user
            return next()
        }
        catch(err) {
            console.log('@@@-> token verify err : ', err)
            calc.logError('token verify', err)
            if(err.name == 'TokenExpiredError') {
                return res.status(419).json({
                    resultCode : 419,
                    resultMsg : '만료된 토큰입니다.'
                })
            } else {
                return res.status(401).json({
                    resultCode : 401,
                    resultMsg : '유효하지 않은 토큰입니다.'
                })
            }
        }
    }
}

module.exports = token