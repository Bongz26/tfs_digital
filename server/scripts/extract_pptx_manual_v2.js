const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'temp_pptx');
const pptDir = path.join(outDir, 'ppt', 'slides');

console.log('Reading slides from:', pptDir);

try {
    if (!fs.existsSync(pptDir)) {
        console.log('No slides dir found! Did unzip work?');
        process.exit(1);
    }

    const files = fs.readdirSync(pptDir).filter(f => f.match(/^slide\d+\.xml$/));

    // Sort naturally
    files.sort((a, b) => {
        const aNum = parseInt(a.match(/slide(\d+)\.xml/)[1]);
        const bNum = parseInt(b.match(/slide(\d+)\.xml/)[1]);
        return aNum - bNum;
    });

    let fullText = "";

    files.forEach(file => {
        const content = fs.readFileSync(path.join(pptDir, file), 'utf8');

        // Extract text content from <a:t>...</a:t>
        // Using [\s\S]*? to match across newlines
        const matches = content.match(/<a:t>([\s\S]*?)<\/a:t>/g);

        if (matches) {
            fullText += `\n\n--- Slide ${file} ---\n`;
            const slideText = matches.map(m => {
                // Remove tags
                let t = m.replace(/<\/?a:t>/g, '');
                // Decode basic entities (could use he library if available, but keeping it simple)
                t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
                return t;
            }).join('\n');
            fullText += slideText;
        }
    });

    console.log('=== PRESENTATION CONTENT START ===');
    console.log(fullText);
    console.log('=== PRESENTATION CONTENT END ===');

} catch (e) {
    console.error(e);
}
