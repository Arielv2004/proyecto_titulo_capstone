const DocumentService = require('../services/document.service');

class DocumentController {
    static async upload(req, res, next) {
        try {
            const result = await DocumentService.uploadDocument({
                file: req.file,
                user: req.user,
            });

            return res.status(201).json({
                success: true,
                message: 'Documento procesado exitosamente.',
                data: result,
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                    documentId: error.documentId || null,
                });
            }
            next(error);
        }
    }

    static async analyze(req, res, next) {
        try {
            const result = await DocumentService.analyzeDocument({
                file: req.file,
                user: req.user,
            });

            return res.status(200).json({
                success: true,
                message: result.isUnreadable
                    ? 'Documento recibido pero no se pudo leer con claridad.'
                    : 'Documento analizado con éxito.',
                data: result,
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                    documentId: error.documentId || null,
                });
            }
            next(error);
        }
    }

    static async confirm(req, res, next) {
        try {
            const { tempId, editedData, wasReviewed } = req.body;
            const result = await DocumentService.confirmDocument({
                tempId,
                editedData,
                wasReviewed: wasReviewed !== undefined ? Boolean(wasReviewed) : (editedData?.wasReviewed !== undefined ? Boolean(editedData.wasReviewed) : true),
                user: req.user,
            });

            return res.status(200).json({
                success: true,
                message: 'Documento confirmado e ingresado al historial.',
                data: result,
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async discard(req, res, next) {
        try {
            const { tempId } = req.body;
            const result = await DocumentService.discardDocument({
                tempId,
                user: req.user,
            });

            return res.status(200).json({
                success: true,
                message: 'Documento temporal descartado.',
                data: result,
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async cleanupTemps(req, res, next) {
        try {
            const result = await DocumentService.cleanupTempDocuments();

            return res.status(200).json({
                success: true,
                message: 'Limpieza de documentos temporales completada.',
                data: result,
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async list(req, res, next) {
        try {
            const { document_type } = req.query;
            const docs = await DocumentService.listDocuments(req.user, { document_type });

            return res.status(200).json({
                success: true,
                data: docs,
            });
        } catch (error) {
            next(error);
        }
    }

    static async getById(req, res, next) {
        try {
            const doc = await DocumentService.getDocumentById(req.params.id, req.user);

            return res.status(200).json({
                success: true,
                data: doc,
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            next(error);
        }
    }

    static async remove(req, res, next) {
        try {
            const result = await DocumentService.deleteDocument(req.params.id, req.user);

            return res.status(200).json({
                success: true,
                message: 'Documento eliminado del historial.',
                data: result,
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            next(error);
        }
    }
}
module.exports = DocumentController;