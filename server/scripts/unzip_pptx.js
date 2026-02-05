const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const filePath = String.raw`c:\Users\Bongz\Documents\WORK\SYSTEM\tfs_digital\client\public\TFS - Operational_Excellence_&_Digital_Transformation B K.pptx`;
const outDir = path.join(__dirname, 'temp_pptx');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
}

try {
    const zip = new AdmZip(filePath);
    zip.extractAllTo(outDir, true);
    console.log('Extracted to ' + outDir);
} catch (e) {
    console.error(e);
}
