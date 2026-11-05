import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {once} from 'node:events';
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));const base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['--require','./tests/loopback-only.cjs','node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,SLKM_PREVIEW:'true',NEXT_PUBLIC_SITE_URL:base},windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',x=>output+=x);server.stderr.on('data',x=>output+=x);
try{let ready=false;for(let i=0;i<80;i++){if(output.includes('Ready')){ready=true;break}if(server.exitCode!==null)throw new Error(output);await new Promise(r=>setTimeout(r,250))}if(!ready)throw new Error(output);for(const file of ['tests/browser.mjs','tests/interactions.mjs']){const child=spawn(process.execPath,[file],{env:{...process.env,TEST_URL:base},windowsHide:true,stdio:'inherit'});const [code]=await once(child,'exit');if(code)throw new Error(`${file} failed: ${code}`)}}finally{server.kill()}
