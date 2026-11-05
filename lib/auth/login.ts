import 'server-only';
import {sessionContext,sessionClient} from '../supabase';
import {loginCredentials} from './credentials';
import {authenticateAdmin} from './access';
import {AdminAccessError,accessFailure,classifyAuthError,logAuthFailure,type LoginResult} from './errors';

export async function performLogin(form:FormData):Promise<LoginResult>{
 const credentials=loginCredentials.safeParse({email:form.get('email'),password:form.get('password')});
 if(!credentials.success){logAuthFailure(new AdminAccessError('credentials','form_validation'));return {ok:false,code:'credentials'}}
 let context:Awaited<ReturnType<typeof sessionContext>>|undefined;
 let failure:AdminAccessError|undefined;
 try{
  context=await sessionContext({writable:true});
  const user=await authenticateAdmin(context.db,credentials.data);
  context.assertCookiesWritten();
  const persisted=await (await sessionClient()).auth.getUser();
  if(persisted.error)throw classifyAuthError(persisted.error,'session_persistence');
  if(persisted.data.user?.id!==user.id)throw new AdminAccessError('session_lost','session_persistence');
 }catch(error){
  failure=accessFailure(error,'login');
  if(context){
   try{context.assertCookiesWritten()}catch(cookieError){failure=accessFailure(cookieError,'cookie_write')}
   try{const {error:cleanupError}=await context.db.auth.signOut({scope:'local'});if(cleanupError)logAuthFailure(new AdminAccessError('logout_failed','login_cleanup',cleanupError))}
   catch{logAuthFailure(new AdminAccessError('logout_failed','login_cleanup'))}
  }
 }
 if(failure){logAuthFailure(failure);return {ok:false,code:failure.code}}
 return {ok:true};
}
