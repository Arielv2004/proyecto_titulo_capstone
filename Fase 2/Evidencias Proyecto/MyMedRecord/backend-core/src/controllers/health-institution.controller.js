const HealthInstitutionRepository = require(
  '../repositories/health-institution.repository'
);

class HealthInstitutionController {
  static async list(req, res, next) {
    try {
      const institutions =
        await HealthInstitutionRepository.findActive();

      return res.status(200).json({
        success: true,
        institutions,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = HealthInstitutionController;