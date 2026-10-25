const db = require('../config/db');
const clinical = require('../security/clinical-store');
class DocumentRepository {
  static createDocument(data) { return clinical.create('documents', { ...data, status: data.status || 'PROCESANDO' }); }
  static updateDocumentStatus(id,status,ocrConfidence=null) {
    return clinical.update('documents',id,{status,...(ocrConfidence===null?{}:{ocr_confidence:ocrConfidence}),updated_at:new Date()});
  }
  static async findById(id) { return clinical.decode('documents',(await db.query('SELECT * FROM documents WHERE id=$1',[id])).rows[0]); }
  static async findTempById(id) { return clinical.decode('documents',(await db.query("SELECT * FROM documents WHERE id=$1 AND status='TEMP' FOR UPDATE",[id])).rows[0]); }
  static async findByPatient(patientId,{document_type=null}={}) {
    const result=await db.query("SELECT * FROM documents WHERE patient_id=$1 AND status NOT IN ('TEMP','ELIMINADO') AND ($2::text IS NULL OR document_type=$2) ORDER BY created_at DESC",[patientId,document_type]);
    const documents=[];
    for(const row of result.rows) {
      const {file_path,ocr_raw_text,encrypted_notes,...doc}=await clinical.decode('documents',row);
      doc.structured=doc.document_type==='RECETA'?await this.findPrescriptionByDocumentId(doc.id):doc.document_type==='EXAMEN_LAB'?await this.findLabReportByDocumentId(doc.id):null;
      documents.push(doc);
    }
    return documents;
  }
  static createPrescription(data) { return clinical.create('prescriptions',{...data,status:'ACTIVA'}); }
  static createPrescriptionItem(data) { return clinical.create('prescription_items',data); }
  static createLabReport(data) { return clinical.create('lab_reports',data); }
  static createLabTestItem(data) { return clinical.create('lab_test_items',data); }
  static async structured(table,itemsTable,foreignKey,documentId) {
    const row=(await db.query('SELECT * FROM '+table+' WHERE document_id=$1',[documentId])).rows[0];
    if(!row) return null;
    const parent=await clinical.decode(table,row);
    const items=(await db.query('SELECT * FROM '+itemsTable+' WHERE '+foreignKey+'=$1 ORDER BY created_at,id',[row.id])).rows;
    return {...parent,items:await Promise.all(items.map(item=>clinical.decode(itemsTable,item)))};
  }
  static findPrescriptionByDocumentId(id) { return this.structured('prescriptions','prescription_items','prescription_id',id); }
  static findLabReportByDocumentId(id) { return this.structured('lab_reports','lab_test_items','lab_report_id',id); }
  static async logAudit({userId=null,patientId=null,action,details=null,ipAddress='0.0.0.0',userAgent=null}) {
    return (await db.query('INSERT INTO audit_logs(user_id,patient_id,action,details,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[userId,patientId,action,details?JSON.stringify(details):null,ipAddress,userAgent])).rows[0];
  }
  static async softDelete(id) {
    return db.transaction(async()=>{
      const existing=await this.findById(id);
      if(!existing) return null;
      require('../security/deletion-ledger').record(id,existing.patient_id);
      const doc=await clinical.update('documents',id,{status:'ELIMINADO',ocr_raw_text:null,updated_at:new Date()});
      await db.query('INSERT INTO document_deletions(document_id,patient_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,doc.patient_id]);
      return doc;
    });
  }
  static updateDocumentOnConfirm(id,data={}) { return clinical.update('documents',id,{...data,ocr_raw_text:null,updated_at:new Date()}); }
  static async findExpiredTemps(hours=24) {
    const result=await db.query("SELECT * FROM documents WHERE status='TEMP' AND created_at<now()-$1*interval '1 hour'",[hours]);
    return Promise.all(result.rows.map(row=>clinical.decode('documents',row)));
  }
  static async markManyAsEliminado(ids) { return Promise.all(ids.map(id=>this.softDelete(id))); }
}
module.exports=DocumentRepository;
