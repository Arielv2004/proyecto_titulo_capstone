const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const bucket = config.SUPABASE?.BUCKET || 'medical-documents';
const url = config.SUPABASE?.URL;
const key = config.SUPABASE?.SERVICE_ROLE_KEY;
const client = url && key ? createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}) : null;
class SupabaseService {
  static isConfigured() { return Boolean(client); }
  static isSupabaseUrl(ref) { return typeof ref==='string' && (ref.startsWith('supabase://'+bucket+'/') || (url && ref.startsWith(url+'/storage/v1/object/'))); }
  static objectPath(ref) {
    if(!this.isSupabaseUrl(ref)) throw new Error('Referencia de almacenamiento no válida.');
    const prefix='supabase://'+bucket+'/';
    const value=ref.startsWith(prefix)?ref.slice(prefix.length):ref.slice(ref.indexOf('/'+bucket+'/')+bucket.length+2).split('?')[0];
    const path=decodeURIComponent(value);
    if(!path || path.split('/').includes('..')) throw new Error('Referencia no válida.');
    return path;
  }
  static async assertPrivate() {
    if(!client) throw new Error('Storage no configurado.');
    const {data,error}=await client.storage.getBucket(bucket);
    if(error || !data || data.public) throw new Error('El bucket debe ser privado antes de iniciar.');
  }
  static async makePrivate() {
    if(!client) throw new Error('Storage no configurado.');
    const {error}=await client.storage.updateBucket(bucket,{public:false});
    if(error) throw new Error('No se pudo configurar el bucket privado.');
    await this.assertPrivate();
  }
  static async uploadFile(buffer,name,type) {
    await this.assertPrivate();
    const {error}=await client.storage.from(bucket).upload(name,buffer,{contentType:type,upsert:false,cacheControl:'0'});
    if(error) {const e=new Error('No se pudo guardar el archivo. Intenta nuevamente.');e.statusCode=503;throw e;}
    return {objectRef:'supabase://'+bucket+'/'+name,fileName:name};
  }
  static async downloadFile(ref) {
    if(!client) throw new Error('Storage no configurado.');
    const object=this.objectPath(ref).split('/').map(encodeURIComponent).join('/');
    const nonce=require('node:crypto').randomUUID();
    const response=await fetch(url+'/storage/v1/object/authenticated/'+encodeURIComponent(bucket)+'/'+object+'?fresh='+nonce,{
      headers:{apikey:key,Authorization:'Bearer '+key,'Cache-Control':'no-cache'},cache:'no-store',signal:AbortSignal.timeout(30000)
    });
    if(!response.ok) {const e=new Error('Archivo no disponible.');e.statusCode=response.status===404?404:503;throw e;}
    return Buffer.from(await response.arrayBuffer());
  }
  static async deleteFile(ref) {
    if(!client) return false;
    try {const {error}=await client.storage.from(bucket).remove([this.objectPath(ref)]);return !error;} catch {return false;}
  }
}
module.exports=SupabaseService;
