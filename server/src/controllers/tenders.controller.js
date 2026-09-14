import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { validateTender, getTender, listTenders, revalidateTender } from '../services/tender.service.js';
function db(){if(mongoose.connection.readyState!==1)throw new ApiError(503,'MongoDB is not connected.','DATABASE_UNAVAILABLE');}
async function audit(req,action,id,metadata={}){try{await AuditLog.create({userId:req.user?.id,action,resource:'Tender',resourceId:String(id),metadata,ip:req.ip});}catch{}}
export async function validate(req,res){db();try{const result=await validateTender({userId:req.user.id,documentId:req.body?.documentId,title:req.body?.title,text:req.body?.text});await audit(req,'VALIDATE',result.tender._id,{documentId:req.body?.documentId||null,requirementCount:result.requirements.length});return ok(res,result,'Tender validated',201);}catch(e){const c=e.code||'TENDER_VALIDATION_FAILED';const s=['TENDER_TEXT_REQUIRED','INVALID_DOCUMENT_ID','DOCUMENT_NOT_FOUND','DOCUMENT_NOT_PROCESSED'].includes(c)?400:(['NOT_A_TENDER_DOCUMENT','NOT_A_TENDER_DOCUMENT_TYPE'].includes(c)?422:502);throw new ApiError(s,e.message,c);}}
export async function list(req,res){db();return ok(res,{items:await listTenders(req.user.id,req.user.role)});}
export async function get(req,res){db();if(!mongoose.isValidObjectId(req.params.id))throw new ApiError(400,'Invalid tender ID.','INVALID_ID');try{return ok(res,await getTender(req.params.id));}catch(e){throw new ApiError(e.code==='TENDER_NOT_FOUND'?404:502,e.message,e.code||'TENDER_GET_FAILED');}}
export async function revalidate(req,res){db();if(!mongoose.isValidObjectId(req.params.id))throw new ApiError(400,'Invalid tender ID.','INVALID_ID');try{const result=await revalidateTender(req.params.id,req.user.id);await audit(req,'REVALIDATE',result.tender._id,{requirementCount:result.requirements.length});return ok(res,result,'Tender revalidated');}catch(e){throw new ApiError(e.code==='TENDER_NOT_FOUND'?404:403,e.message,e.code||'TENDER_REVALIDATION_FAILED');}}
