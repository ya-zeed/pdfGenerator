const express = require('express');
const puppeteer = require('puppeteer');
const multer = require('multer');
const AdmZip = require('adm-zip'); // Required for ZIP file handling

const app = express();
const port = 3000;

// Setup multer middleware for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let browser;
let pagePool = [];

async function createBrowser() {
    browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox'],
    });
}

async function createPage() {
    if (pagePool.length > 0) {
        return pagePool.pop();
    } else {
        const page = await browser.newPage();
        return page;
    }
}

async function releasePage(page) {
    await page.setContent('');
    pagePool.push(page);
}

app.post('/pdf', upload.single('htmlFile'), async (req, res) => {
    try {
        // Ensure a file was uploaded
        if (!req.file || !req.file.buffer) {
            throw new Error("No file uploaded");
        }

        let htmlContent;

        // Check if the uploaded file is a ZIP file
        if (req.file.mimetype === 'application/zip') {
            const zip = new AdmZip(req.file.buffer);
            const zipEntries = zip.getEntries();

            // Find the first HTML file in the ZIP
            const htmlEntry = zipEntries.find(entry => entry.name.endsWith('.html'));
            if (!htmlEntry) {
                throw new Error("No HTML file found in the ZIP");
            }
            htmlContent = htmlEntry.getData().toString('utf8');
        } else if (req.file.mimetype === 'text/html' || req.file.mimetype === 'application/xhtml+xml') {
            // Process HTML file directly
            htmlContent = req.file.buffer.toString('utf8');
        } else {
            throw new Error("Unsupported file type");
        }

        const page = await createPage();

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('print');

        const pdf = await page.pdf({
            printBackground: true,
            format: 'A4',
        });

        await releasePage(page);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=result.pdf');
        res.send(pdf);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
});

app.listen(port, async () => {
    console.log(`Server listening on port ${port}`);
    await createBrowser();
});
