const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('No DATABASE_URL found');
    process.exit(1);
}

try {
    const url = new URL(dbUrl);
    const hostname = url.hostname;
    console.log(`🔍 Attempting to resolve ${hostname} using DoH...`);

    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`;

    const req = https.request(dohUrl, {
        headers: {
            'Accept': 'application/dns-json'
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                if (response.Status === 0 && response.Answer) {
                    const aRecord = response.Answer.find(r => r.type === 1); // Type 1 is A (IPv4)
                    if (aRecord) {
                        console.log(`✅ RESOLVED IP: ${aRecord.data}`);
                        // Write to a temporary file so we can read it
                        fs.writeFileSync(path.join(__dirname, 'resolved_ip.txt'), aRecord.data);
                    } else {
                        console.error('❌ No A record found in DoH response');
                        console.log(response);
                    }
                } else {
                    console.error('❌ DoH Resolution Failed');
                    console.log(response);
                }
            } catch (e) {
                console.error('❌ Failed to parse DoH response', e);
            }
        });
    });

    req.on('error', (e) => {
        console.error('❌ HTTPS Request failed', e);
    });

    req.end();

} catch (e) {
    console.error('Invalid DATABASE_URL', e);
}
