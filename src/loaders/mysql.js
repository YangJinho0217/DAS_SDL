const mapper = require("./mapper");

const query = {
    query: async (nameSpace, selectId, param, connection) => {
        const sql = mapper.getStatement(nameSpace, selectId, param, { language: 'sql', indent: '  ' });
        console.log('----------------------------------------');
        console.log(sql);
        console.log('----------------------------------------');
        try {
            const [rows, fields] = await connection.query(sql);
            console.log(rows);
            return rows;
        } catch (error) {
            throw error; // 에러를 던져서 호출한 곳에서 처리
        }
    },
    select: async (nameSpace, selectId, param, connection) => {
        const sql = mapper.getStatement(nameSpace, selectId, param, { language: 'sql', indent: '  ' });
        console.log('----------------------------------------');
        console.log(sql);
        console.log('----------------------------------------');
        try {
            const [rows, fields] = await connection.query(sql);
            console.log(rows);
            return typeof rows[0] == 'undefined' ? {} : rows[0];
        } catch (error) {
            throw error;
        }
    },
    proc: async (nameSpace, selectId, param, connection) => {
        const sql = mapper.getStatement(nameSpace, selectId, param, { language: 'sql', indent: '  ' });
        console.log('----------------------------------------');
        console.log(sql);
        console.log('----------------------------------------');
        try {
            const result = await connection.query(sql);
            return result[0].affectedRows;
        } catch (error) {
            throw error;
        }
    },
    value: async (nameSpace, selectId, param, connection) => {
        const sql = mapper.getStatement(nameSpace, selectId, param, { language: 'sql', indent: '  ' });
        console.log('----------------------------------------');
        console.log(sql);
        console.log('----------------------------------------');
        try {
            const [rows, fields] = await connection.query(sql);
            console.log(rows);
            return rows[0] ? rows[0][fields[0].name] : null; // rows[0]가 undefined일 경우 null 반환
        } catch (error) {
            throw error; // 에러를 던져서 호출한 곳에서 처리
        }
    }
};

module.exports = query;
