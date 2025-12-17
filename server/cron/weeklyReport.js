const cron = require('node-cron');
const { query } = require('../config/db');
const nodemailer = require('nodemailer');

// Email config
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Helper to generate PDF Buffer (actually HTML)
const generatePDFBuffer = (data, dateRange) => {
    let html = `
    <h1>Weekly Usage Report (Detailed)</h1>
    <p><strong>Period:</strong> ${dateRange}</p>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
            <tr style="background-color: #f2f2f2;">
                <th>Date</th>
                <th>Case Number</th>
                <th>Deceased</th>
                <th>Item Used</th>
                <th>Category</th>
                <th>Qty</th>
            </tr>
        </thead>
        <tbody>
    `;

    data.forEach(row => {
        const dateDisplay = row.funeral_date
            ? new Date(row.funeral_date).toLocaleDateString()
            : new Date(row.created_at).toLocaleDateString();

        html += `
            <tr>
                <td>${dateDisplay}</td>
                <td>${row.case_number || '-'}</td>
                <td>${row.deceased_name || '-'}</td>
                <td>${row.item_name} ${row.item_color ? '(' + row.item_color + ')' : ''}</td>
                <td>${row.category}</td>
                <td>${Math.abs(row.quantity_change)}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    return html;
};

// Core function to generate and send report
const sendWeeklyReportLogic = async (options = {}) => {
    // Default to last 7 days if no options provided
    let { days, startDate, endDate } = options;

    // Logic: 
    // 1. If startDate/endDate provided, use them.
    // 2. If days provided, use now - days.
    // 3. Default to 7 days.
    // User requested constraint: Start data from 2025-12-08 (Real Data Start)

    let queryParams = [];
    let dateFilter = "";
    let dateRangeDisplay = "";

    if (startDate && endDate) {
        dateFilter = "sm.created_at >= $1 AND sm.created_at <= $2";
        queryParams = [startDate, endDate]; // Ensure these include time if needed, e.g. .setHours(23,59,59)
        // For simple dates (YYYY-MM-DD), casting might be needed or standard comp works if DB matches.
        // Let's assume passed as strings 'YYYY-MM-DD'.
        // Appending time for full day coverage:
        if (startDate.length === 10) queryParams[0] = `${startDate} 00:00:00`;
        if (endDate.length === 10) queryParams[1] = `${endDate} 23:59:59`;
        dateRangeDisplay = `${new Date(queryParams[0]).toLocaleDateString()} - ${new Date(queryParams[1]).toLocaleDateString()}`;

    } else {
        const d = days || 7;
        console.log(`Using default interval: ${d} days`);
        dateFilter = `sm.created_at >= NOW() - INTERVAL '${d} days'`;
        dateRangeDisplay = `Last ${d} Days`;
    }

    // Hard Constraint from User: "start on 08 dec 2025"
    // We should strictly ignore anything before this date if possible, or trust the inputs.
    // Given the request "it should start on 08 dec 2025", let's clamp the start date in the SQL effectively?
    // Actually, SQL allows multiple conditions. Let's add the floor.
    // dateFilter += " AND sm.created_at >= '2025-12-08 00:00:00'"; 

    // However, if the user explicitly asks for older data (unlikely given the prompt), we might block it.
    // Let's add the constraint to valid data.

    console.log(`📊 Generating Inventory Report. Filter: ${dateFilter}, Params: ${queryParams}`);

    try {
        const sql = `
            SELECT 
                sm.created_at,
                c.funeral_date,
                c.case_number,
                c.deceased_name,
                i.name as item_name,
                i.color as item_color,
                i.category,
                sm.quantity_change
            FROM stock_movements sm
            LEFT JOIN cases c ON sm.case_id = c.id
            JOIN inventory i ON sm.inventory_id = i.id
            WHERE ${dateFilter}
                AND sm.quantity_change < 0
                AND sm.created_at >= '2025-12-08 00:00:00'
            ORDER BY sm.created_at DESC
        `;

        const result = await query(sql, queryParams);

        if (result.rows.length === 0) {
            console.log('No movements. Skipping email.');
            return { success: false, message: 'No movements found for this period.' };
        }

        const html = generatePDFBuffer(result.rows, dateRangeDisplay);
        const managementEmail = process.env.MANAGEMENT_EMAIL || process.env.SMTP_USER; // Fallback

        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: managementEmail,
            subject: `📊 Detailed Inventory Usage Report - ${new Date().toLocaleDateString()}`,
            html: html
        });

        console.log(`✅ Weekly Report Sent to ${managementEmail}`);
        return { success: true, message: `Report sent to ${managementEmail}` };

    } catch (error) {
        console.error('❌ Failed to send weekly report:', error);
        return { success: false, error: error.message };
    }
};

// Schedule: Every Monday at 08:00 AM
const scheduleWeeklyReport = () => {
    console.log('📅 Initializing Weekly Report Scheduler (Mondays @ 08:00)...');

    cron.schedule('0 8 * * 1', async () => {
        console.log('⏰ Running Weekly Inventory Report (Auto)...');
        await sendWeeklyReportLogic(7);
    });
};

module.exports = {
    scheduleWeeklyReport,
    sendWeeklyReportLogic
};
