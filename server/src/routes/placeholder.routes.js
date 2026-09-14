import {Router} from 'express'; const r=Router();r.get('/',(req,res)=>res.json({success:true,data:[],message:'Endpoint reserved for upcoming phase'}));export default r;
