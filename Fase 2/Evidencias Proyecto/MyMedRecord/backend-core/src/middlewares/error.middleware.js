module.exports=(err,req,res,next)=>{
  if (err.code === 'STORAGE_UNREACHABLE') return res.status(503).json({success:false,code:'STORAGE_UNREACHABLE',message:'No se pudo conectar con el almacenamiento de documentos. El archivo no se guardÛ ni se enviÛ a analizar. Intenta nuevamente cuando se restablezca la conexiÛn.'});
  const status=err.statusCode || (err.name==='MulterError'?400:500);
  if(status>=500) console.error('[API] Operaci√≥n fallida:',err.code || err.name || 'Error');
  res.status(status).json({success:false,message:status>=500?'No fue posible completar la operaci√≥n. Intenta nuevamente.':err.message});
};
