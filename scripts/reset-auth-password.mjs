// Manual owner-only reset. Never run automatically; never accept a password in argv.
import {createClient} from '@supabase/supabase-js';
import {supabaseConfig} from '../lib/auth/config.ts';
import {authDiagnostic,AdminAccessError} from '../lib/auth/errors.ts';
function hiddenPrompt(prompt){
 if(!process.stdin.isTTY||!process.stdout.isTTY)throw new Error('Interactive terminal required');
 return new Promise((resolve,reject)=>{
  let value='',finished=false;process.stdout.write(prompt);process.stdin.setEncoding('utf8');process.stdin.setRawMode(true);process.stdin.resume();
  const finish=(error)=>{if(finished)return;finished=true;process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');if(error)reject(error);else resolve(value)};
  const onData=chunk=>{if(chunk.startsWith('\u001b'))return;for(const character of chunk){if(character==='\u0003')return finish(new Error('Cancelled'));if(character==='\r'||character==='\n')return finish();if(character==='\u007f'||character==='\b')value=[...value].slice(0,-1).join('');else if(character>=' '&&value.length<1024)value+=character;}};
  process.stdin.on('data',onData);
 });
}
try{
 const config=supabaseConfig(),id=process.argv[2],secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!config.ok||!secret||!id||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))throw new Error('Owner configuration and exact Auth UUID required');
 if(!config.url.startsWith('https://'))throw new Error('HTTPS required');
 const db=createClient(config.url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.auth.admin.getUserById(id);
 if(error)throw new AdminAccessError('auth_service','owner_lookup',error);
 if(data.user?.email!=='slkmtransport@gmail.com')throw new Error('UUID does not match the exact target email');
 let password=await hiddenPrompt('Nouveau mot de passe (saisie masquée) : ');
 let confirmation=await hiddenPrompt('Confirmer le nouveau mot de passe : ');
 if(password!==confirmation||password.length<12)throw new Error('Passwords must match and have at least 12 characters');
 const result=await db.auth.admin.updateUserById(id,{password});password='';confirmation='';
 if(result.error)throw new AdminAccessError('auth_service','owner_password_reset',result.error);
 console.log('Mot de passe réinitialisé. Aucun rôle ou autre utilisateur modifié.');
}catch(error){
 if(error instanceof AdminAccessError)console.error(JSON.stringify(authDiagnostic(error)));
 else console.error('Réinitialisation non effectuée : vérifier la configuration serveur propriétaire, l’UUID exact, le terminal interactif et la confirmation du mot de passe (12 caractères minimum).');
 process.exitCode=1;
}
