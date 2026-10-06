// A local-only Auth fixture. No real account, password, email or database is used.
import { createServer as createHttpServer } from 'node:http'
import { createServer as createViteServer } from 'vite'
const email = 'activation@memorial.test'
const id = 'a0000000-0000-0000-0000-000000000001'
const personId = 'b0000000-0000-0000-0000-000000000001'
const person = { id:personId, auth_id:id, name:'Activation Test', role:'Test member', email, access:'staff', active:true, admin:false }
const user = { id, aud:'authenticated', role:'authenticated', email, email_confirmed_at:new Date().toISOString(), created_at:new Date().toISOString(), app_metadata:{provider:'email',providers:['email']}, user_metadata:{} }
const token = () => {
  const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')
  const payload=Buffer.from(JSON.stringify({sub:id,email,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')
  return {access_token:header+'.'+payload+'.test-signature',refresh_token:'local-fixture-only',expires_in:3600,token_type:'bearer',user}
}
createHttpServer(async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS')
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
  let body='';for await(const part of req)body+=part
  let input={};try{input=JSON.parse(body)}catch{}
  const path=new URL(req.url,'http://localhost').pathname
  let result=[],status=200
  if(path.endsWith('/request-activation-code'))result={requested:true}
  else if(path.endsWith('/verify')){
    if(input.token!=='12345678'){status=403;result={code:'otp_expired',msg:'Invalid code'}}
    else result=token()
  } else if(path.endsWith('/token'))result=token()
  else if(path.endsWith('/logout'))result={}
  else if(path.endsWith('/user'))result=user
  else if(path.endsWith('/rpc/claim_account'))result=[person]
  else if(path.endsWith('/rpc/my_seats'))result=[{slug:'staff',role_in_body:'member'}]
  else if(path.endsWith('/person'))result=[person]
  res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(result))
}).listen(8788,'127.0.0.1')
const vite=await createViteServer({server:{host:'127.0.0.1',port:5174,strictPort:true},define:{
  'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:8788'),
  'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify('local-test-only'),
}})
await vite.listen();console.log('Local Auth fixture: http://localhost:5174 (code 12345678; no email sent)')
