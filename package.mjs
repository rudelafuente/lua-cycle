import {mkdir,copyFile,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const file of ['index.html','style.css','app.js','core.js','tips.js','actualizar.html','storage.js','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'])await copyFile(file,`dist/${file}`);
await copyFile('.nojekyll','dist/.nojekyll');
