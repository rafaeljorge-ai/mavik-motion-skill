#!/usr/bin/env node
/** Validate semver single version across all published surfaces; read-only. */
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=x=>readFileSync(path.join(root,x),'utf8');
const ver=JSON.parse(read('package.json')).version;
if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(ver))throw new Error('SemVer inválido: '+ver);
for(const f of ['plugin.json','.claude-plugin/plugin.json','.codex-plugin/plugin.json']){if(JSON.parse(read(f)).version!==ver)throw new Error('Version mismatch: package.json vs '+f);}
if(JSON.parse(read('.claude-plugin/marketplace.json')).plugins[0].version!==ver)throw new Error('Version mismatch: marketplace.json');
if(!read('skills/mavik-create-motions/SKILL.md').includes(`\nversion: ${ver}\n`))throw new Error('Version mismatch: skills/mavik-create-motions/SKILL.md');
for(const file of ['SKILL.md','skills/mavik-motion/SKILL.md']){
 if(!read(file).startsWith(`---\nname: mavik-motion\nversion: ${ver}\n`))throw new Error('Version mismatch: '+file);
}
if(!read('CHANGELOG.md').includes(`## [${ver}]`))throw new Error('CHANGELOG sem release '+ver);
if(!read('README.md').includes(`v${ver}`))throw new Error('README com versão divergente');
console.log('PASS: SemVer '+ver+' em package, plugin, skills, changelog e README');
