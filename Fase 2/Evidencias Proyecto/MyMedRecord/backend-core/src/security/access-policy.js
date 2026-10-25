const db=require('../config/db');
async function requireVerifiedDoctor(id) {
  const result=await db.query("SELECT u.id FROM users u JOIN doctor_profiles p ON p.user_id=u.id WHERE u.id=$1 AND u.role='MEDICO' AND u.is_active=TRUE AND p.verification_status='VERIFICADO' AND p.is_available_for_sharing=TRUE",[id]);
  if(!result.rowCount) { const error=new Error('El perfil médico no está habilitado para consultar fichas.');error.statusCode=403;throw error; }
}
function requireLiveGrant(grant) {
  if(!grant || grant.is_revoked || new Date(grant.expires_at)<=new Date() || new Date(grant.starts_at || grant.created_at)>new Date()) {
    const error=new Error('El permiso no está vigente.');error.statusCode=403;throw error;
  }
  return grant;
}
async function doctorMiddleware(req,res,next) { try { await requireVerifiedDoctor(req.user.id);next(); } catch(error){next(error);} }
module.exports={requireVerifiedDoctor,requireLiveGrant,doctorMiddleware};
