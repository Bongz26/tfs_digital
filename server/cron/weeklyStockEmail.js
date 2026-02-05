const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize SendGrid
if (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith('SG.')) {
    sgMail.setApiKey(process.env.SMTP_PASS);
}

const logDebug = (message) => {
    try {
        const logFile = path.join(__dirname, '..', 'stock_email_debug.log');
        const timestamp = new Date().toISOString();
        const line = `[${timestamp}] ${message}\n`;
        fs.appendFileSync(logFile, line);
    } catch (e) {
        console.error('Failed to write to debug log:', e);
    }
    console.log(message);
};

const sendStockReportLogic = async () => {
    logDebug('📊 Generating Weekly Stock Report (via Supabase JS Client)...');

    try {
        // Initialize Supabase Client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase credentials (SUPABASE_URL or SUPABASE_KEY)');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch all inventory items
        const { data: items, error } = await supabase
            .from('inventory')
            .select('name, category, stock_quantity, low_stock_threshold, color, model, location')
            .order('category')
            .order('name');

        if (error) {
            throw new Error(`Supabase Query Failed: ${error.message}`);
        }

        logDebug(`Found ${items.length} inventory items.`);

        if (items.length === 0) {
            logDebug('⚠️ No inventory found. Skipping email.');
            return { success: false, error: 'No inventory found.' };
        }

        // Generate HTML with Thusanang Branding and Logo
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4; margin: 0; padding: 20px; }
                .container { width: 100%; max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                
                /* BRAND HEADER */
                .header { 
                    background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 100%); 
                    color: white; 
                    padding: 30px 40px; 
                    text-align: center; 
                    border-bottom: 5px solid #d4af37; /* Gold accent */
                }
                .logo { max-width: 100px; margin-bottom: 15px; background: white; padding: 8px; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
                .header h1 { margin: 10px 0 0; font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
                .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; font-weight: 300; }
                
                .meta { padding: 15px 40px; background: #fff8e1; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; font-size: 13px; color: #7f6a00; font-weight: 600; }
                
                /* TABLE DESIGN */
                table { width: 100%; border-collapse: collapse; }
                th { background-color: #f8f9fa; color: #b71c1c; font-weight: 700; text-transform: uppercase; font-size: 11px; padding: 15px; text-align: left; border-bottom: 2px solid #e0e0e0; letter-spacing: 0.5px; }
                td { padding: 12px 15px; border-bottom: 1px solid #f0f0f0; font-size: 13px; vertical-align: middle; }
                
                tr:nth-child(even) { background-color: #fafafa; }
                tr:hover { background-color: #fef5f5; } 
                
                .qty { font-weight: bold; text-align: center; font-size: 14px; }
                
                /* BADGES */
                .badge { padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; display: inline-block; min-width: 70px; text-align: center; letter-spacing: 0.5px; }
                .badge-low { background-color: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
                .badge-ok { background-color: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
                
                .footer { background: #333; color: #aaa; padding: 20px; text-align: center; font-size: 11px; }
                .footer strong { color: #d4af37; }
            </style>
            </head>
            <body>
            <div class="container">
                <div class="header">
                    <img src="cid:logo" alt="Thusanang Logo" class="logo" />
                    <h1>Weekly Stock Report</h1>
                    <p>Thusanang Funeral Services</p>
                </div>
                <div class="meta">
                    <span>Generated: ${new Date().toLocaleDateString()}</span>
                    <span>Time: ${new Date().toLocaleTimeString()}</span>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Model</th>
                            <th>Item Name</th>
                            <th>Color</th>
                            <th>Location</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        items.forEach(item => {
            const isLow = item.stock_quantity <= (item.low_stock_threshold || 0);
            const badgeClass = isLow ? 'badge-low' : 'badge-ok';
            const statusText = isLow ? 'LOW STOCK' : 'IN STOCK';
            const location = item.location || 'Showroom';

            html += `
                <tr>
                    <td style="font-weight: 600; color: #555;">${item.model || '-'}</td>
                    <td style="font-weight: 500;">${item.name}</td>
                    <td>${item.color || '-'}</td>
                    <td style="color: #666; font-style: italic;">${location}</td>
                    <td class="qty" style="${isLow ? 'color: #c62828;' : 'color: #333;'}">${item.stock_quantity}</td>
                    <td style="text-align: center;">
                        <span class="badge ${badgeClass}">${statusText}</span>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <div class="footer">
                    &copy; ${new Date().getFullYear()} <strong>Thusanang Funeral Services</strong><br>
                    Respectful • Professional • Dignified
                </div>
            </div>
            </body>
            </html>
        `;

        // Load Logo
        let attachments = [];
        try {
            const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
            if (fs.existsSync(logoPath)) {
                const logoContent = fs.readFileSync(logoPath).toString('base64');
                attachments.push({
                    content: logoContent,
                    filename: 'logo.png',
                    type: 'image/png',
                    disposition: 'inline',
                    content_id: 'logo'
                });
                logDebug('✅ Logo attached successfully');
            } else {
                logDebug('⚠️ Logo file not found at ' + logoPath);
            }
        } catch (e) {
            logDebug('⚠️ Failed to attach logo: ' + e.message);
        }

        // Send Email
        const to = ['dtremotesup@gmail.com', 'studio@dondastech.co.za', 'management@thusanangfs.co.za'];
        const from = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER || 'noreply@tfsdigital.com';
        const subject = `📦 Weekly Stock Report - ${new Date().toLocaleDateString()}`;

        logDebug(`📧 Sending stock report to ${to} from ${from}...`);

        const msg = {
            to,
            from: { email: from, name: 'TFS Inventory' },
            subject,
            html,
            attachments
        };

        if (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith('SG.')) {
            try {
                await sgMail.send(msg);
                logDebug('✅ Sent via SendGrid API');
            } catch (sgError) {
                logDebug(`❌ SendGrid API Error: ${sgError.message}`);
                if (sgError.response) logDebug(`❌ Body: ${JSON.stringify(sgError.response.body)}`);
                throw sgError;
            }
        } else {
            logDebug('⚠️ No Email Configuration Found.');
            logDebug('ℹ️ SIMULATION MODE: Email content generated.');
            return {
                success: true,
                message: 'Report generated successfully. Email NOT sent (Missing Configuration).'
            };
        }

        logDebug('✅ Weekly Stock Report sent successfully!');
        return { success: true };

    } catch (error) {
        logDebug(`❌ Failed to send weekly stock report: ${error.message}`);
        console.error('❌ Failed to send weekly stock report:', error);
        return { success: false, error: error.message };
    }
};

const scheduleStockReport = () => {
    // Schedule: Every Tuesday at 14:15
    console.log('📅 Initializing Weekly Stock Report Scheduler (Tuesdays @ 14:15)...');

    cron.schedule('15 14 * * 2', async () => {
        console.log('⏰ Running Weekly Stock Report (Auto)...');
        await sendStockReportLogic();
    });
};

module.exports = {
    scheduleStockReport,
    sendStockReportLogic
};
