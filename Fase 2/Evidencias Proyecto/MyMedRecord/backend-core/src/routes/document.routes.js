const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();

const DocumentController = require('../controllers/document.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// ─── Configuración de multer (Almacenamiento en memoria RAM) ──────────────
const storage = multer.memoryStorage();

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
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB estricto contra memory exhaustion
});

// ─── Middleware de autenticación ──────────────────────────────────────────
router.use(authMiddleware);

// ─── Rutas ────────────────────────────────────────────────────────────────
router.post('/upload', upload.single('file'), DocumentController.upload);
router.post('/analyze', upload.single('file'), DocumentController.analyze);
router.post('/confirm', DocumentController.confirm);
router.post('/discard', DocumentController.discard);
router.post('/cleanup-temps', DocumentController.cleanupTemps);
router.get('/', DocumentController.list);
router.delete('/:id', DocumentController.remove);
router.get('/:id', DocumentController.getById);

module.exports = router;