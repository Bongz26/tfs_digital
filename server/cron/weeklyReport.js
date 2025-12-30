const cron = require('node-cron');
const { query } = require('../config/db');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
// Use Web API instead of SMTP to bypass Render's port blocking
if (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith('SG.')) {
    sgMail.setApiKey(process.env.SMTP_PASS);
    console.log('📧 SendGrid Web API initialized');
} else {
    console.warn('⚠️ SendGrid API key not configured properly');
}

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
    // 🔍 DEBUG: Log all email environment variables
    console.log('🔍 [EMAIL DEBUG] Starting email report generation...');
    console.log('🔍 [EMAIL DEBUG] SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
    console.log('🔍 [EMAIL DEBUG] SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
    console.log('🔍 [EMAIL DEBUG] SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
    console.log('🔍 [EMAIL DEBUG] SMTP_PASS:', process.env.SMTP_PASS ? `SET (${process.env.SMTP_PASS.substring(0, 10)}...)` : 'NOT SET');
    console.log('🔍 [EMAIL DEBUG] MANAGEMENT_EMAIL:', process.env.MANAGEMENT_EMAIL || 'NOT SET');
    console.log('🔍 [EMAIL DEBUG] REPORT_CC_EMAIL:', process.env.REPORT_CC_EMAIL || 'NOT SET');
    console.log('🔍 [EMAIL DEBUG] SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL || 'NOT SET');

    // Check email config first
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ [EMAIL DEBUG] Missing SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS)');
        return { success: false, error: 'Server email configuration is missing.' };
    }

    console.log('✅ [EMAIL DEBUG] SMTP configuration verified');

    // Default to last 7 days if no options provided
    let { days, startDate, endDate } = options;

    let queryParams = [];
    let dateFilter = "";
    let dateRangeDisplay = "";

    if (startDate && endDate) {
        dateFilter = "sm.created_at >= $1 AND sm.created_at <= $2";
        queryParams = [startDate, endDate];
        if (startDate.length === 10) queryParams[0] = `${startDate} 00:00:00`;
        if (endDate.length === 10) queryParams[1] = `${endDate} 23:59:59`;
        dateRangeDisplay = `${new Date(queryParams[0]).toLocaleDateString()} - ${new Date(queryParams[1]).toLocaleDateString()}`;

    } else {
        const d = days || 7;
        console.log(`Using default interval: ${d} days`);
        dateFilter = `sm.created_at >= NOW() - INTERVAL '${d} days'`;
        dateRangeDisplay = `Last ${d} Days`;
    }

    const minAllowedDate = new Date('2025-12-08T00:00:00');
    let startD = startDate;
    let endD = endDate;

    if (startDate && startDate.length === 10) startD = `${startDate} 00:00:00`;
    if (endDate && endDate.length === 10) endD = `${endDate} 23:59:59`;

    if (startD) {
        const currentStartDate = new Date(startD);
        if (currentStartDate < minAllowedDate) {
            startD = '2025-12-08 00:00:00';
        }
    }

    // If not provided (auto mode), calculate them
    if (!startD || !endD) {
        const d = days || 7;
        const now = new Date();
        const past = new Date();
        past.setDate(now.getDate() - d);
        endD = now.toISOString();
        startD = past.toISOString();
    }

    queryParams = [startD, endD];

    console.log(`📊 Generating Inventory Report. Filter: ${dateRangeDisplay}, Params: ${queryParams}`);

    try {
        // Ensure table exists to prevent 500
        const tableCheck = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'stock_movements'
            ) as exists
        `);

        if (!tableCheck.rows[0].exists) {
            console.warn('⚠️ stock_movements table does not exist yet. Returning empty report.');
            return { success: false, error: 'No stock movement history found (table missing).' };
        }

        const sql = `
            SELECT 
                COALESCE(sm.created_at, c.funeral_date) as created_at,
                c.funeral_date,
                c.case_number,
                c.deceased_name,
                COALESCE(i.name, c.casket_type) as item_name,
                COALESCE(i.color, c.casket_colour) as item_color,
                COALESCE(i.category, 'coffin') as category,
                COALESCE(sm.quantity_change, -1) as quantity_change
            FROM cases c
            LEFT JOIN stock_movements sm ON c.id = sm.case_id AND sm.quantity_change < 0
            LEFT JOIN inventory i ON sm.inventory_id = i.id
            WHERE c.funeral_date >= $1 AND c.funeral_date <= $2
               -- Also include manual movements meant for these dates that might not be linked to a case in the range (manual usage)
            UNION ALL
            SELECT 
                sm.created_at,
                NULL as funeral_date,
                'MANUAL' as case_number,
                sm.reason as deceased_name,
                i.name as item_name,
                i.color as item_color,
                i.category,
                sm.quantity_change
            FROM stock_movements sm
            JOIN inventory i ON sm.inventory_id = i.id
            WHERE sm.case_id IS NULL 
              AND sm.quantity_change < 0
              AND sm.created_at >= $1 AND sm.created_at <= $2
            ORDER BY funeral_date DESC, created_at DESC
        `;

        const result = await query(sql, queryParams);

        if (result.rows.length === 0) {
            console.log('No movements. Skipping email.');
            return { success: false, error: 'No movements found for this period to report.' };
        }

        const html = generatePDFBuffer(result.rows, dateRangeDisplay);
        const managementEmail = process.env.MANAGEMENT_EMAIL || process.env.SMTP_USER;
        const additionalEmail = process.env.REPORT_CC_EMAIL || 'khumalo4sure@gmail.com';
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER;

        console.log('📧 [EMAIL DEBUG] Preparing to send email...');
        console.log('📧 [EMAIL DEBUG] FROM:', fromEmail);
        console.log('📧 [EMAIL DEBUG] TO:', managementEmail);
        console.log('📧 [EMAIL DEBUG] CC:', additionalEmail);
        console.log('📧 [EMAIL DEBUG] Report contains', result.rows.length, 'rows');

        try {
            // Use SendGrid Web API instead of SMTP
            const msg = {
                to: managementEmail,
                from: {
                    email: fromEmail,
                    name: 'Thusanang Reports'
                },
                cc: additionalEmail,
                subject: `📊 Detailed Inventory Usage Report - ${new Date().toLocaleDateString()}`,
                html: html
            };

            console.log('📧 [EMAIL DEBUG] Sending via SendGrid Web API...');
            await sgMail.send(msg);

            console.log(`✅ Weekly Report Sent successfully via SendGrid Web API!`);
            console.log(`✅ TO: ${managementEmail}`);
            console.log(`✅ CC: ${additionalEmail}`);
            return { success: true, message: `Report sent to ${managementEmail}` };
        } catch (emailError) {
            console.error('❌ [EMAIL DEBUG] SendGrid API error details:');
            console.error('❌ Error code:', emailError.code || 'N/A');
            console.error('❌ Error message:', emailError.message || 'N/A');
            console.error('❌ Response:', emailError.response?.body || 'N/A');
            console.error('❌ Full error:', emailError);
            throw emailError; // Re-throw to be caught by outer catch
        }

    } catch (error) {
        console.error('❌ Failed to send weekly report:', error);
        if (error.code === 'ETIMEDOUT') {
            return { success: false, error: 'Email server connection timed out. Host might be blocked or port incorrect.' };
        }
        return { success: false, error: 'Server error: ' + error.message };
    }
};

// Schedule: Every Monday at 09:45 AM
const scheduleWeeklyReport = () => {
    console.log('📅 Initializing Weekly Report Scheduler (Mondays @ 09:45)...');

    cron.schedule('45 9 * * 1', async () => {
        console.log('⏰ Running Weekly Inventory Report (Auto)...');
        await sendWeeklyReportLogic(7);
    });
};

module.exports = {
    scheduleWeeklyReport,
    sendWeeklyReportLogic
};
