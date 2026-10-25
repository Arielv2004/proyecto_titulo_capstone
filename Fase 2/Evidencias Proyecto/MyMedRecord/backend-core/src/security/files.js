function validateFile(buffer,mime) {
  let actual;
  if (Buffer.isBuffer(buffer) && buffer.length > 0 && buffer.length <= 10*1024*1024) {
    if (buffer.subarray(0,5).toString()==='%PDF-') actual='application/pdf';
    else if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) actual='image/png';
    else if(buffer[0]===255 && buffer[1]===216 && buffer[2]===255) actual='image/jpeg';
    else if(buffer.subarray(0,4).toString()==='RIFF' && buffer.subarray(8,12).toString()==='WEBP') actual='image/webp';
  }
  if(!actual || actual!==mime) { const error=new Error('El archivo no es un PDF o una imagen válida de hasta 10 MB.');error.statusCode=400;throw error; }
  return actual;
}
module.exports={validateFile};
