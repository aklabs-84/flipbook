import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Configure worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = pdfWorker;

export const convertPDFToImages = async (file: File): Promise<Blob[]> => {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF
        const loadingTask = getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
            cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        const pageCount = pdf.numPages;
        const images: Blob[] = [];

        console.log(`PDF Loaded. Pages: ${pageCount}`);

        for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);

            // Determine scale (Standard quality)
            const viewport = page.getViewport({ scale: 2.0 }); // 2x scale

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) continue;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85); // Use JPEG for better compression/speed
            });

            if (blob) {
                images.push(blob);
            }
        }

        return images;
    } catch (error) {
        console.error("PDF Conversion Error:", error);
        throw error;
    }
};
