const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();

const DocumentController = require('../controllers/document.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

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
        const error = new Error('Formato no permitido. Solo JPG, PNG, WEBP o PDF.');
        error.statusCode = 400;
        cb(error, false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB estricto contra memory exhaustion
});

// ─── Middleware de autenticación ──────────────────────────────────────────
router.use(authMiddleware, rbacMiddleware('PACIENTE'));

// ─── Rutas ────────────────────────────────────────────────────────────────
router.post('/upload', upload.single('file'), DocumentController.upload);
router.post('/analyze', upload.single('file'), DocumentController.analyze);
router.post('/confirm', DocumentController.confirm);
router.post('/discard', DocumentController.discard);
router.get('/', DocumentController.list);
router.patch('/:id', DocumentController.update);
router.delete('/:id', DocumentController.remove);
router.get('/:id/file', DocumentController.file);
router.get('/:id', DocumentController.getById);

module.exports = router;
