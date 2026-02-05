const path = require('path');
const { getTextExtractor } = require('office-text-extractor');

const filePath = String.raw`c:\Users\Bongz\Documents\WORK\SYSTEM\tfs_digital\client\public\TFS - Operational_Excellence_&_Digital_Transformation B K.pptx`;

console.log('Extracting text from:', filePath);

try {
    const extractor = new getTextExtractor();
    extractor.extractText(filePath)
        .then(text => {
            console.log('--- START OF PRESENTATION TEXT ---');
            console.log(text);
            console.log('--- END OF PRESENTATION TEXT ---');
        })
        .catch(err => {
            console.error('Error extracting text:', err);
        });
} catch (error) {
    // If it's not a class, try calling it directly or check generic usage
    console.log('Failed to use as class, checking if it requires just the function call...');
    // Fallback or retry logic if needed, but for now let's see if this works
    console.error(error);
}
