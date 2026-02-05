const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const filePath = String.raw`c:\Users\Bongz\Documents\WORK\SYSTEM\tfs_digital\client\public\TFS - Operational_Excellence_&_Digital_Transformation B K.pptx`;

console.log('Extracting text from:', filePath);

try {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    let fullText = "";

    // Filter for slide XML files
    const slideEntries = zipEntries.filter(entry => entry.entryName.match(/ppt\/slides\/slide\d+\.xml/));

    // Sort slides (numerically if possible, though mostly sequential)
    slideEntries.sort((a, b) => {
        const aNum = parseInt(a.entryName.match(/slide(\d+)\.xml/)[1]);
        const bNum = parseInt(b.entryName.match(/slide(\d+)\.xml/)[1]);
        return aNum - bNum;
    });

    slideEntries.forEach(entry => {
        const xmlContent = entry.getData().toString('utf8');
        // Simple regex to extract text from <a:t> tags (PowerPoint text)
        // and maybe <a:p> for paragraphs to add newlines

        // This regex looks for <a:t>...</a:t>
        const textMatches = xmlContent.match(/<a:t>([^<]*)<\/a:t>/g);

        if (textMatches) {
            const slideText = textMatches.map(t => t.replace(/<\/?a:t>/g, '')).join(' ');
            fullText += `\n\n--- Slide ${entry.entryName} ---\n${slideText}`;
        }
    });

    console.log('--- START OF PRESENTATION TEXT ---');
    console.log(fullText);
    console.log('--- END OF PRESENTATION TEXT ---');

} catch (e) {
    console.error('Error extracting with adm-zip:', e);
}
