module.exports=(err,req,res,next)=>{
  const status=err.statusCode || (err.name==='MulterError'?400:500);
  if(status>=500) console.error('[API] Operación fallida:',err.code || err.name || 'Error');
  res.status(status).json({success:false,message:status>=500?'No fue posible completar la operación. Intenta nuevamente.':err.message});
};
