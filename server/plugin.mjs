import { createExportStore } from './export-store.mjs';
export function localDataPlugin(){
 const store=createExportStore();
 const install=server=>{server.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url??'/', 'http://127.0.0.1');let decoded;try{decoded=decodeURIComponent(url.pathname).replaceAll('\\','/')}catch{res.statusCode=400;res.end('Invalid path');return;}if(decoded.startsWith('/data/')||decoded.startsWith('/@fs/')&&/\/data\//i.test(decoded)){res.statusCode=403;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({error:'原始数据目录不直接提供文件访问，请通过只读Trace接口读取。'}));return;}if(!url.pathname.startsWith('/api/local-data/'))return next();
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');res.end(JSON.stringify({error:'此数据接口只允许只读GET请求。'}));return;}
  try{
   const route=url.pathname.slice('/api/local-data/'.length);let result;
   if(route==='manifest')result=(await store.load()).manifest;
   else if(route==='traces')result=await store.list(url.searchParams);
   else if(route==='cases')result=(await store.load()).cases;
   else if(route==='guide-example'){result=await store.guideExample();if(!result){res.statusCode=404;result={error:'导出中暂时没有可呈现的工具参数案例。'};}}
   else if(/^traces\/[^/]+(?:\/raw)?$/.test(route)){
    const id=decodeURIComponent(route.split('/')[1]);if(route.endsWith('/raw'))result=(await store.load()).records.get(id)?.raw;else result=await store.detail(id);
    if(!result){res.statusCode=404;result={error:'当前导出中没有这条Trace。请重新查询或核对数据目录。'};}
   }else{res.statusCode=404;result={error:'没有这个数据读取入口。'};}
   res.end(JSON.stringify(result));
  }catch(error){res.statusCode=503;res.end(JSON.stringify({error:'导出数据读取失败：'+(error instanceof Error?error.message:String(error))}));}
 });};
 return {name:'local-langfuse-export',configureServer:install,configurePreviewServer:install};
}
