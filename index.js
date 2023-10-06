const express = require('express');
const app = express();
const port = 3000;
const puppeteer = require('puppeteer');
const multer = require('multer'); // Import multer

// Setup multer middleware to handle file uploads
const storage = multer.memoryStorage(); // Store the file in memory
const upload = multer({ storage: storage });

app.post('/pdf', upload.single('htmlFile'), async (req, res) => { // use `upload.single('htmlFile')` middleware
    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox'],
        });
        const page = await browser.newPage();

        // Ensure the file was uploaded
        if (!req.file || !req.file.buffer) {
            throw new Error("No file uploaded");
        }

        const htmlContent = req.file.buffer.toString('utf8'); // Convert buffer to string

        // Set content of the page to the uploaded HTML
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('print');

        const pdf = await page.pdf({
            printBackground: true,
            format: 'A4',
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=result.pdf');
        res.send(pdf);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
