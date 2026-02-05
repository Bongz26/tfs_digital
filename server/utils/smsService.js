// server/utils/smsService.js
const nodemailer = require('nodemailer');

// --- Helper: Email Transporter (Reused from sms.js logic) ---
let emailTransporter = null;
function getEmailTransporter() {
    if (emailTransporter) return emailTransporter;
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '0', 10) || 0;
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) return null;
    emailTransporter = nodemailer.createTransport({ host, port: port || 587, secure, auth: { user, pass } });
    return emailTransporter;
}

/**
 * Send an SMS (or backup Email) to a driver
 * @param {string} phone - Driver's phone number
 * @param {string} message - The message body
 */
exports.sendSMS = async (phone, message) => {
    try {
        console.log(`📱 [MOCK SMS] To: ${phone} | Msg: "${message}"`);

        // Future: Integrate Twilio, SendGrid SMS, or local gateway here.
        // For now, if we have email config, we can try to send an email as a fallback if the phone is actually an email address (unlikely for drivers but good for testing).

        // If the user has an email-to-sms gateway (e.g. 1234567890@vodacom.co.za), we could use that.
        // But preventing crash is key.
        return { success: true, method: 'mock' };

    } catch (err) {
        console.error('❌ SMS Send Failed:', err);
        return { success: false, error: err.message };
    }
};
