'use client';
import {useState,useEffect} from 'react';
export function LoginForm({children,message}:{children:React.ReactNode;message?:{fr:string;ar:string}}){
 const [pending,setPending]=useState(false);
 useEffect(()=>{
  const reset=()=>setPending(false);window.addEventListener('pageshow',reset);return()=>window.removeEventListener('pageshow',reset);
 },[]);
 return <form action="/admin/login/submit" method="post" encType="application/x-www-form-urlencoded" onSubmit={event=>{if(pending)event.preventDefault();else setPending(true)}}>
  {children}
  <button className="button primary" type="submit" disabled={pending}>{pending?'Connexion… / جارٍ الدخول…':'Se connecter / الدخول'}</button>
  {message&&<p className="error" role="alert">{message.fr}<br/>{message.ar}</p>}
 </form>;
}
