const fs=require('node:fs'),path=require('node:path');
const out=path.join(__dirname,'site');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,'vendor'),{recursive:true});
for(const name of ['index.html','app.js','style.css','trunk-logic.mjs','page-groups.mjs','manifest.webmanifest','icon.svg'])fs.copyFileSync(path.join(__dirname,name),path.join(out,name));
fs.mkdirSync(path.join(out,'plans'));fs.copyFileSync(path.join(__dirname,'plans/titles.json'),path.join(out,'plans/titles.json'));fs.writeFileSync(path.join(out,'.nojekyll'),'');
const pdfjs=path.join(__dirname,'node_modules/pdfjs-dist'),pdflib=path.join(__dirname,'node_modules/pdf-lib');
for(const name of ['pdf.mjs','pdf.worker.mjs'])fs.copyFileSync(path.join(pdfjs,'build',name),path.join(out,'vendor',name));
for(const name of ['cmaps','standard_fonts','wasm'])if(fs.existsSync(path.join(pdfjs,name)))fs.cpSync(path.join(pdfjs,name),path.join(out,'vendor',name),{recursive:true});
fs.copyFileSync(path.join(pdflib,'dist/pdf-lib.min.js'),path.join(out,'vendor/pdf-lib.min.js'));fs.copyFileSync(path.join(pdfjs,'LICENSE'),path.join(out,'vendor/PDFJS-LICENSE'));fs.copyFileSync(path.join(pdflib,'LICENSE.md'),path.join(out,'vendor/PDFLIB-LICENSE'));
console.log('Built static app in site/ (no plan PDFs or user projects).');
