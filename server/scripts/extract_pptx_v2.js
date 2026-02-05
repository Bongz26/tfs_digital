const officeParser = require('officeparser');
const filePath = String.raw`c:\Users\Bongz\Documents\WORK\SYSTEM\tfs_digital\client\public\TFS - Operational_Excellence_&_Digital_Transformation B K.pptx`;

console.log('Extracting text from:', filePath);

officeParser.parseOfficeAsync(filePath, { outputErrorToConsole: true })
    .then(data => {
        console.log('--- START OF PRESENTATION TEXT ---');
        console.log(data);
        console.log('--- END OF PRESENTATION TEXT ---');
    })
    .catch(err => {
        console.error('Error parsing file:', err);
    });
