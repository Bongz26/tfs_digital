const { sendWeeklyReportLogic } = require('./cron/weeklyReport');

async function testReport() {
    console.log('--- TESTING REPORT LOGIC ---');
    try {
        const result = await sendWeeklyReportLogic({
            startDate: '2025-12-15',
            endDate: '2025-12-23'
        });
        console.log('Result:', result);
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

testReport();
