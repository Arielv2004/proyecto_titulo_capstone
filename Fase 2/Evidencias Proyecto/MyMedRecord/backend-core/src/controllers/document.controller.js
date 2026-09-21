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
}

module.exports = DocumentController;