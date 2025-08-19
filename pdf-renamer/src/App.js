// App.js - A React app to process and rename PDF files based on extracted names from scanned forms

import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { createWorker } from 'tesseract.js';

// Set up pdf.js worker using local worker script
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
// import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js';
// pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

function App() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [processedFiles, setProcessedFiles] = useState([]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setProcessedFiles([]);
  };

  const processFiles = async () => {
    setStatus('Processing...');
    const results = [];

    for (const file of files) {
      try {
        // Step 1: Load PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // Assuming the form is on the first page
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR

        // Create canvas to render page
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        await page.render({ canvasContext: context, viewport }).promise;

        // Step 2: Perform OCR using Tesseract.js
        const worker = await createWorker();
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        const { data: { text } } = await worker.recognize(canvas.toDataURL());
        await worker.terminate();

        // Step 3: Extract name from OCR text
        // Assuming the form has a field like "Name: John Doe" or similar.
        // You may need to adjust the regex based on your form's structure.
        // For example, looking for "Name:" followed by text until newline or another field.
        const nameMatch = text.match(/Name:\s*([A-Za-z\s]+)/i);
        let extractedName = 'unknown';
        if (nameMatch && nameMatch[1]) {
          extractedName = nameMatch[1].trim().replace(/\s+/g, '_'); // Replace spaces with underscores for filename
        }

        // Step 4: Create a download link for the renamed file
        const newFileName = `${extractedName}_${file.name}`;
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        results.push({ original: file.name, newName: newFileName, downloadUrl: url });
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        results.push({ original: file.name, newName: 'error', downloadUrl: null });
      }
    }

    setProcessedFiles(results);
    setStatus('Processing complete.');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>PDF Form Renamer</h1>
      <p>Upload scanned PDF membership forms. The app will extract the name via OCR and provide renamed download links.</p>
      <input type="file" multiple accept=".pdf" onChange={handleFileChange} />
      <button onClick={processFiles} disabled={files.length === 0}>Process Files</button>
      <p>{status}</p>
      {processedFiles.length > 0 && (
        <ul>
          {processedFiles.map((result, index) => (
            <li key={index}>
              Original: {result.original} → New: {result.newName}
              {result.downloadUrl && (
                <a href={result.downloadUrl} download={result.newName}> Download</a>
              )}
            </li>
          ))}
        </ul>
      )}
      <p>Note: This assumes the name field is labeled "Name:" in the form. Adjust the regex in the code if your form differs. OCR accuracy depends on scan quality.</p>
    </div>
  );
}

export default App;