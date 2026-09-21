const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();

const DocumentController = require('../controllers/document.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// ─── Configuración de multer ─────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', '..', 'uploads');
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato no permitido. Solo JPG, PNG, WEBP o PDF.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── Middleware de autenticación ──────────────────────────────────────────
router.use(authMiddleware);

// ─── Rutas ────────────────────────────────────────────────────────────────
router.post('/upload', upload.single('file'), DocumentController.upload);
router.get('/', DocumentController.list);
router.get('/:id', DocumentController.getById);

module.exports = router;