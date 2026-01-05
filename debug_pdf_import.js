
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
    const pdf = require('pdf-parse');
    console.log('Type of pdf:', typeof pdf);
    console.log('pdf value:', pdf);
    if (typeof pdf === 'function') {
        console.log('It is a function');
    } else {
        console.log('It is NOT a function');
        console.log('Keys:', Object.keys(pdf));
        if (pdf.default) {
            console.log('Type of pdf.default:', typeof pdf.default);
        }
    }
} catch (e) {
    console.error('Require failed:', e);
}

import * as pdfImport from 'pdf-parse';
console.log('Import * as pdfImport:', pdfImport);
console.log('Type of pdfImport.default:', typeof pdfImport.default);
