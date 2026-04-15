import sharp from 'sharp';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');

export async function processAndSaveImage(fileBuffer, originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

    if (!allowedTypes.includes(ext)) {
        const error = new Error('Unsupported image type. Use jpg, png, webp, or gif');
        error.statusCode = 400;
        throw error;
    }

    const filename = `${randomUUID()}.webp`;
    const outputPath = path.join(UPLOAD_DIR, filename);

    await sharp(fileBuffer)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outputPath);

    return `/uploads/${filename}`;
}
