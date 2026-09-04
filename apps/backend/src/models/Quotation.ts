import { Schema, model, Document, Types } from "mongoose";
import { ServiceType } from "./Project";
import { CUSTOMER_PHONE_REGEX } from "../utils/constants";

export enum QuotationStatus { DRAFT="draft", SENT="sent", ACCEPTED="accepted", REJECTED="rejected" }
export interface IQuotationItem { description:string; quantity:number; rate:number; amount:number; }
export interface IQuotation extends Document {
  _id: Types.ObjectId; companyId?:Types.ObjectId; branchId?:Types.ObjectId; quotationNumber:string;
  customerName:string; customerPhone:string; customerEmail?:string; customerCompany?:string; address:string; city?:string;
  serviceType:ServiceType; propertyType?:string; area?:number; areaUnit?:"sq_ft"|"sq_m"; treatmentDescription?:string;
  visitFrequency?:string; numberOfVisits?:number; items:IQuotationItem[]; subtotal:number; discount:number; taxRate:number; taxAmount:number; additionalCharges:number; grandTotal:number;
  terms?:string; internalNotes?:string; validUntil:Date; status:QuotationStatus; createdBy:Types.ObjectId; sentAt?:Date; acceptedAt?:Date; rejectedAt?:Date; leadId?:Types.ObjectId; convertedProjectId?:Types.ObjectId; convertedAt?:Date; createdAt:Date; updatedAt:Date;
}
const itemSchema = new Schema({description:{type:String,required:true,trim:true,maxlength:300},quantity:{type:Number,required:true,min:0.01},rate:{type:Number,required:true,min:0},amount:{type:Number,required:true,min:0}},{_id:false});
const schema = new Schema<IQuotation>({
 companyId:{type:Schema.Types.ObjectId,ref:"Company",index:true}, branchId:{type:Schema.Types.ObjectId,ref:"Branch",index:true}, quotationNumber:{type:String,required:true,unique:true,index:true},
 customerName:{type:String,required:true,trim:true,minlength:2,maxlength:100}, customerPhone:{type:String,required:true,trim:true,validate:{validator:(v:string)=>CUSTOMER_PHONE_REGEX.test(v),message:"Invalid phone"}}, customerEmail:{type:String,trim:true,lowercase:true}, customerCompany:{type:String,trim:true,maxlength:150}, address:{type:String,required:true,trim:true,maxlength:500}, city:{type:String,trim:true,maxlength:100},
 serviceType:{type:String,enum:Object.values(ServiceType),required:true}, propertyType:{type:String,trim:true,maxlength:100}, area:{type:Number,min:0}, areaUnit:{type:String,enum:["sq_ft","sq_m"]}, treatmentDescription:{type:String,trim:true,maxlength:2000}, visitFrequency:{type:String,trim:true,maxlength:100}, numberOfVisits:{type:Number,min:1,max:365},
 items:{type:[itemSchema],required:true,validate:{validator:(v:IQuotationItem[])=>v.length>0,message:"At least one line item is required"}}, subtotal:{type:Number,required:true,min:0}, discount:{type:Number,default:0,min:0}, taxRate:{type:Number,default:0,min:0,max:100}, taxAmount:{type:Number,default:0,min:0}, additionalCharges:{type:Number,default:0,min:0}, grandTotal:{type:Number,required:true,min:0},
 terms:{type:String,trim:true,maxlength:5000}, internalNotes:{type:String,trim:true,maxlength:2000}, validUntil:{type:Date,required:true,index:true}, status:{type:String,enum:Object.values(QuotationStatus),default:QuotationStatus.DRAFT,index:true}, createdBy:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true}, sentAt:Date, acceptedAt:Date, rejectedAt:Date, leadId:{type:Schema.Types.ObjectId,ref:"Lead",index:true}, convertedProjectId:{type:Schema.Types.ObjectId,ref:"Project"}, convertedAt:Date
},{timestamps:true});
schema.index({companyId:1,branchId:1,status:1,createdAt:-1});
schema.index({companyId:1,customerPhone:1});
export const Quotation=model<IQuotation>("Quotation",schema);
