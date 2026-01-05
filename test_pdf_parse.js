
import fs from 'fs';
import pdf from 'pdf-parse';

async function testPdf() {
    try {
        console.log('Testing pdf-parse import...');

        const pdfPath = "/Users/sairamvendra/Downloads/OG/OG . THE BACK STORY .pdf";
        if (fs.existsSync(pdfPath)) {
            console.log(`Found PDF at ${pdfPath}`);
            const dataBuffer = fs.readFileSync(pdfPath);
            const data = await pdf(dataBuffer);
            console.log('PDF Text Length:', data.text.length);
            console.log('PDF Preview:', data.text.substring(0, 500));
        } else {
            console.log('PDF not found at path.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testPdf();
