import jwt from 'jsonwebtoken'; import {Request,Response,NextFunction} from 'express';
export interface AuthRequest extends Request {userId?:string}
export function auth(req:AuthRequest,res:Response,next:NextFunction){const token=req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):undefined); if(!token)return res.status(401).json({message:'Unauthorized'}); try{const p=jwt.verify(token,process.env.JWT_SECRET!) as {id:string}; req.userId=p.id; next();}catch{return res.status(401).json({message:'Invalid or expired session'});}}
