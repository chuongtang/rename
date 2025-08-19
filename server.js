const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const { fromPath } = require('pdf2pic');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/upload', upload.array('pdfs'), async (req, res) => {
  const renamedFiles = [];

  for (const file of req.files) {
    const pdfPath = file.path;
    const converter = fromPath(pdfPath, {
      density: 300,
      savePath: './temp',
      format: 'png',
      width: 1000,
      height: 1400,
    });

    const image = await converter(1); // Convert first page
    const result = await Tesseract.recognize(image.path, 'eng');
    const text = result.data.text;

    const nameMatch = text.match(/Name:\s*(.+)/i);
    const name = nameMatch?.[1]?.trim().replace(/[\/\\?%*:|"<>]/g, '-') || 'Unknown';
    const newFileName = `${name}.pdf`;
    const newPath = path.join('renamed', newFileName);

    fs.renameSync(pdfPath, newPath);
    renamedFiles.push(newFileName);

    fs.unlinkSync(image.path); // Clean up temp image
  }

  res.json(renamedFiles);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
