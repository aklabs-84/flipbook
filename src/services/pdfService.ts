import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const convertPDFToImages = async (file: File): Promise<Blob[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;
    const images: Blob[] = [];

    for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);

        // Determine scale (Standard quality)
        const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        } as any;

        await page.render(renderContext).promise;

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/webp', 0.85);
        });

        if (blob) {
            images.push(blob);
        }
    }

    return images;
};
