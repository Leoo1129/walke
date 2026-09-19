import { Router } from 'express';
import multer from 'multer';
import { requireVerified } from '../middleware/auth.js';
import { processAndSaveImage } from '../controllers/imageController.js';
import { HttpError } from '../utils/errors.js';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/', requireVerified, upload.single('image'), async (req, res) => {
    if (!req.file) {
        throw new HttpError(400, 'No image file provided');
    }
    const url = await processAndSaveImage(req.file.buffer, req.file.originalname);
    return res.status(201).json({ url });
});

export default router;
