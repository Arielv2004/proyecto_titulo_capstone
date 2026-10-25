const sessions = require('../security/sessions');
module.exports = async (req,res,next) => {
  try {
    req.user = await sessions.authenticate(req);
    if (!req.user) return res.status(401).json({success:false,message:'La sesión no está vigente. Inicia sesión nuevamente.'});
    next();
  } catch(error) { next(error); }
};
