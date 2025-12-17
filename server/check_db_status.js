const { query } = require('./config/db');

async function checkDB() {
    try {
        const res = await query("SELECT current_database(), now()");
        console.log(JSON.stringify(res.rows, null, 2));
        const maxId = await query("SELECT max(id) FROM cases");
        console.log("Max ID:", maxId.rows[0].max);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDB();
