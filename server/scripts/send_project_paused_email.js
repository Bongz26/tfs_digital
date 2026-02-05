require('dotenv').config({ path: '../.env' });
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

const recipients = ['bongzdondas@gmail.com', 'khumalo4sure@gmail.com'];
const subject = 'Action Required: Project Paused';

const htmlContent = `<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Paused</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            background-color: #f9f9f9;
            margin: 0;
            padding: 40px 20px;
            color: #333333;
            line-height: 1.6;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            border: 1px solid #e1e1e1;
        }

        .header {
            background-color: #6366f1;
            /* Indigo-500 similar to Render/Modern platforms */
            padding: 24px;
            text-align: center;
        }

        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 20px;
            font-weight: 600;
        }

        .content {
            padding: 32px;
        }

        .project-name {
            font-weight: 700;
            color: #111827;
        }

        .button {
            display: inline-block;
            background-color: #6366f1;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 500;
            margin-top: 24px;
            margin-bottom: 24px;
            text-align: center;
        }

        .button:hover {
            background-color: #4f46e5;
        }

        .footer {
            background-color: #f3f4f6;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
        }

        .highlight-box {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
        }

        .date-info {
            color: #6b7280;
            font-size: 14px;
            margin-top: 10px;
        }
    </style>
</head>

<body>

    <div class="container">
        <div class="header">
            <!-- Mock Logo Placeholder -->
            <div style="margin-bottom: 10px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round" />
                    <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round" />
                    <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round" />
                </svg>
            </div>
            <h1>Action Required: Project Paused</h1>
        </div>

        <div class="content">
            <p>Hello,</p>

            <p>The project <span class="project-name">"paint_queue_db"</span> is currently paused.</p>

            <div class="highlight-box">
                <p style="margin: 0;">
                    All data, including backups and storage objects, remains safe. You can resume this project from the
                    dashboard within <strong>90 days</strong> (until 02 Apr 2026).
                </p>
            </div>

            <p>After that date, this project will not be resumable, but data will still be available for download.</p>

            <p style="margin-bottom: 0;">To prevent future pauses and ensure uninterrupted service, please consider
                upgrading to the Pro plan.</p>

            <center>
                <a href="#" class="button">Resume Project & Upgrade</a>
            </center>

            <div class="date-info">
                Project last paused on: 02 Jan 2026
            </div>
        </div>

        <div class="footer">
            <p>&copy; 2026 Cloud Hosting Services. All rights reserved.</p>
            <p>123 Cloud Way, Tech City, TC 90210</p>
            <p><a href="#" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> | <a href="#"
                    style="color: #6b7280; text-decoration: underline;">Privacy Policy</a></p>
        </div>
    </div>

</body>

</html>`;

async function sendEmail() {
    console.log('Preparing to send demo email...');

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER;
    if (!fromEmail) {
        console.error('❌ No sender email found in env (SENDGRID_FROM_EMAIL or SMTP_USER)');
        return;
    }

    // Check for SendGrid
    if (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith('SG.')) {
        console.log('Using SendGrid API...');
        sgMail.setApiKey(process.env.SMTP_PASS);
        const msg = {
            to: recipients,
            from: {
                email: fromEmail,
                name: 'Hosting Provider (Demo)'
            },
            subject: subject,
            html: htmlContent,
        };
        try {
            await sgMail.send(msg);
            console.log('✅ Email sent via SendGrid to:', recipients.join(', '));
        } catch (error) {
            console.error('❌ SendGrid Error:', error);
            if (error.response) {
                console.error(error.response.body);
            }
        }
    }
    // Fallback to Nodemailer
    else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        console.log('Using Nodemailer (SMTP)...');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        try {
            await transporter.sendMail({
                from: `"Hosting Provider (Demo)" <${fromEmail}>`,
                to: recipients.join(', '),
                subject: subject,
                html: htmlContent,
            });
            console.log('✅ Email sent via SMTP to:', recipients.join(', '));
        } catch (error) {
            console.error('❌ Nodemailer Error:', error);
        }
    } else {
        console.error('❌ No email configuration found (SendGrid key or SMTP credentials).');
        console.log('Env check:');
        console.log('SMTP_HOST:', process.env.SMTP_HOST ? 'Set' : 'Missing');
        console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Missing');
        console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Missing');
    }
}

sendEmail();
