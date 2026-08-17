import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
function parseValue(v){
  v=v.trim();
  if(v.startsWith('[')&&v.endsWith(']')) return v.slice(1,-1).split(',').map(x=>x.trim().replace(/^['\"]|['\"]$/g,''));
  if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) return v.slice(1,-1);
  if(v==='true') return true;if(v==='false') return false;if(/^\d+$/.test(v)) return Number(v);return v;
}
function parseMd(text){
  const m=text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/); if(!m) return {data:{},body:text};
  const data={}; let current=null;
  for(const line of m[1].split(/\r?\n/)){
    if(/^\s*-\s+/.test(line)&&current){data[current]=data[current]||[];data[current].push(parseValue(line.replace(/^\s*-\s+/,'')));continue;}
    const i=line.indexOf(':'); if(i<0) continue; const k=line.slice(0,i).trim(); const v=line.slice(i+1); data[k]=parseValue(v); current=k;
  }
  return {data,body:m[2].trim()};
}
async function load(dir){
  const path=join(root,'content',dir); let names=[]; try{names=await readdir(path)}catch{return []}
  const out=[]; for(const name of names.filter(n=>n.endsWith('.md'))){const text=await readFile(join(path,name),'utf8');const parsed=parseMd(text);out.push({...parsed.data,body:parsed.body,file:name});} return out;
}
const pages=await load('pages'); const products=await load('products'); const categories=await load('categories'); const portfolio=await load('portfolio'); const testimonials=await load('testimonials');
let siteSettings={}; try{siteSettings=parseMd(await readFile(join(root,'content/site-settings.md'),'utf8')).data}catch{}
await writeFile(join(root,'site-data.json'),JSON.stringify({generatedAt:new Date().toISOString(),siteSettings,pages,products,categories,portfolio,testimonials},null,2));
console.log(`Rosini data built: ${categories.length} categorii, ${products.length} produse, ${portfolio.length} proiecte, ${testimonials.length} recenzii.`);
