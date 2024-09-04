const mapper                        = require("./mapper");
const calc                          = require('../module/calc');

const query = {
    query: async (nameSpace, selectId, param, connection) => {
        const sql = mapper.getStatement(nameSpace, selectId, param, { language: 'sql', indent: '  ' });
        console.log('----------------------------------------');
        console.log(sql);
        console.log('----------------------------------------');
        const [rows, fields] = await connection.query(sql);
        // console.log(rows);
        await calc.logInfo('selectId', selectId)
        await calc.logInfo('Parameter', param)
        return rows;
    },
    select: async (nameSpace, selectId, param, connection) => {
        const sql = mapper.getStatement(nameSpace, selectId, param, { language: 'sql', indent: '  ' });
        console.log('----------------------------------------');
        console.log(sql);
        console.log('----------------------------------------');
        const [rows, fields] = await connection.query(sql);
        await calc.logInfo('selectId', selectId)
        await calc.logInfo('Parameter', param)
        return typeof rows[0] == 'undefined' ? {} : rows[0];
    },
    proc: async (nameSpace, selectId, param, connection) => {
        const sql = mapper.getStatement(nameSpace, selectId, param, { language: 'sql', indent: '  ' });
        console.log('----------------------------------------');
        console.log(sql);
        console.log('----------------------------------------');
        const result = await connection.query(sql);
        await calc.logInfo('selectId', selectId)
        await calc.logInfo('Parameter', param)
        return result[0].affectedRows;
    },
    value: async (nameSpace, selectId, param, connection) => {
        const sql = mapper.getStatement(nameSpace, selectId, param, { language: 'sql', indent: '  ' });
        console.log('----------------------------------------');
        console.log(sql);
        console.log('----------------------------------------');
        const [rows, fields] = await connection.query(sql);
        await calc.logInfo('selectId', selectId)
        await calc.logInfo('Parameter', param)
        await calc.logInfo('Data', rows);
        return rows[0] ? rows[0][fields[0].name] : null; // rows[0]가 undefined일 경우 null 반환
    }
};

module.exports = query;
