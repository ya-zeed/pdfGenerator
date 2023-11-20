const express = require('express');
const app = express();
const port = 3000;
const puppeteer = require('puppeteer');
const multer = require('multer'); // Import multer

// Setup multer middleware to handle file uploads
const storage = multer.memoryStorage(); // Store the file in memory
const upload = multer({ storage: storage });

let browser; // Browser instance
let pagePool = []; // Pool of pages

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

app.post('/pdf', upload.single('htmlFile'), async (req, res) => { // use `upload.single('htmlFile')` middleware
    try {
        // Ensure the file was uploaded
        if (!req.file || !req.file.buffer) {
            throw new Error("No file uploaded");
        }

        const htmlContent = req.file.buffer.toString('utf8'); // Convert buffer to string

        // Create a new page or reuse an existing one
        const page = await createPage();

        // Set content of the page to the uploaded HTML
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('print');

        const pdf = await page.pdf({
            printBackground: true,
            format: 'A4',
        });

        // Release the page back to the pool
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
    console.log(`Example app listening on port ${port}`);
    await createBrowser();
});
