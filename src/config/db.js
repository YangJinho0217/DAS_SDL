require('dotenv').config()

// 운영기 dasvers
// module.exports = {
//   port: process.env.PROD_DB_PORT,
//   host: process.env.PROD_DB_HOST,
//   database: process.env.PROD_DB_DATABASE,
//   user: process.env.PROD_DB_USER,
//   password: process.env.PROD_DB_PASSWORD,
// };

// 로컬 local 개발기
// module.exports = {
//   port: process.env.DB_PORT,
//   host : process.env.DB_HOST,
//   database : process.env.DB_DATABASE,
//   user: process.env.DB_USER,
//   password : process.env.DB_PASSWORD,
//   dateStrings: "date",
// }

// 로컬 yagsill 개발기
module.exports = {
  port: process.env.DEV_DB_PORT,
  host : process.env.DEV_DB_HOST,
  database : process.env.DEV_DB_DATABASE,
  user: process.env.DEV_DB_USER,
  password : process.env.DEV_DB_PASSWORD,
  dateStrings: "date",
}


