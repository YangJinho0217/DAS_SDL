const mapper = require("./mapper");
const dbconfig = require("../config/db");
const mysql = require("mysql2/promise");
const pool = mysql.createPool(dbconfig);

const query = {
  query : async (nameSpace, selectId, param) => {
    const con = await pool.getConnection(async conn => conn)
    const sql = mapper.getStatement(nameSpace, selectId, param, {language: 'sql', indent: '  '})
    console.log('----------------------------------------')
    console.log(sql)
    console.log('----------------------------------------')
    try {
        const [rows, fields] = await con.query(sql).catch(async (err) => {
            con.connection.release()
            throw err
        })
        console.log(rows)
        await con.commit()
        return rows
    } catch (error) {
        await con.rollback()
        return error
    } finally {
        con.connection.release()
    }
  },
  select : async (nameSpace, selectId, param) => {
    const con = await pool.getConnection(async conn => conn)
    const sql = mapper.getStatement(nameSpace, selectId, param, {language: 'sql', indent: '  '})
    console.log('----------------------------------------')
    console.log(sql)
    console.log('----------------------------------------')
    try {
        const [rows, fields] = await con.query(sql).catch(async (err) => {
            con.connection.release()
            throw err
        })
        console.log(rows)
        await con.commit()
        return typeof rows[0] == 'undefined' ? {} : rows[0]
    } catch (error) {
        await con.rollback()
        return error
    } finally {
        con.connection.release()
    }
  },
  proc : async (nameSpace, selectId, param) => {
    const con = await pool.getConnection(async conn => conn)
    const sql = mapper.getStatement(nameSpace, selectId, param, {language: 'sql', indent: '  '})
    console.log('----------------------------------------')
    console.log(sql)
    console.log('----------------------------------------')
    try {
        var result = await con.query(sql).catch(async (err) => {
            con.connection.release()
            throw err
        })  
        await con.commit()
        return result[0].affectedRows
    } catch (error) {
        await con.rollback()
        return error
    } finally {
        con.connection.release()
    }
  },
  value : async (nameSpace, selectId, param) => {
    const con = await pool.getConnection(async conn => conn)
    const sql = mapper.getStatement(nameSpace, selectId, param, {language: 'sql', indent: '  '})
    console.log('----------------------------------------')
    console.log(sql)
    console.log('----------------------------------------')
    try {
        const [rows, fields] = await con.query(sql).catch(async (err) => {
            con.connection.release()
            throw err
        }) 
        console.log(rows)
        await con.commit()
        return rows[0][fields[0].name]
    } catch (error) {
        await con.rollback()
        return error
    } finally {
        con.connection.release()
    }
  },
};

module.exports = query;
