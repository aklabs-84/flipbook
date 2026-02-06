/**
 * Optimizes an image file by converting it to WebP format.
 * @param file The original image file
 * @param quality Quality standard (0.0 - 1.0), default 0.8
 * @returns Promise resolving to the new WebP File
 */
export const optimizeImage = (file: File, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            // Clean up memory
            URL.revokeObjectURL(objectUrl);

            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Optional: Max dimension constraint (e.g., 2048px) to prevent massive memory usage
            const MAX_DIMENSION = 2048;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to WebP
            canvas.toBlob((blob) => {
                if (blob) {
                    const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                    const newFile = new File([blob], newFileName, { type: 'image/webp' });
                    resolve(newFile);
                } else {
                    reject(new Error('Canvas to Blob conversion failed'));
                }
            }, 'image/webp', quality);
        };

        img.onerror = (e) => {
            URL.revokeObjectURL(objectUrl);
            reject(e);
        };

        img.src = objectUrl;
    });
};
