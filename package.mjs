import {mkdir,copyFile,rm,readFile} from 'node:fs/promises';
import {dirname} from 'node:path';
// The service worker's ASSETS list is the single source of shipped files.
const assets=JSON.parse((await readFile('sw.js','utf8')).match(/const ASSETS=(\[.*?\]);/)[1].replace(/'/g,'"')).filter(a=>a!=='./').map(a=>a.slice(2));
await rm('dist',{recursive:true,force:true});
for(const file of [...assets,'sw.js','actualizar.html','.nojekyll']){await mkdir(dirname(`dist/${file}`),{recursive:true});await copyFile(file,`dist/${file}`);}
