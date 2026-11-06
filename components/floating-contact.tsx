'use client';
import {useEffect,useState} from 'react';
import type {Locale} from '@/lib/model';
import {Brand} from './social';
export function FloatingContact({href,locale}:{href:string;locale:Locale}){
 const [hide,setHide]=useState(false);
 useEffect(()=>{
  if(!('IntersectionObserver' in window))return;
  const visible=new Set<Element>();
  const observer=new IntersectionObserver(entries=>{
   entries.forEach(entry=>{if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);});
   setHide(visible.size>0);
  },{rootMargin:'24px'});
  document.querySelectorAll('.complaint, .quick-links, .fleet-section .scroll-controls').forEach(node=>observer.observe(node));
  return()=>observer.disconnect();
 },[]);
 return <a hidden={hide} className="whatsapp-float" href={href} aria-label={locale==='ar'?'تواصلوا معنا عبر واتساب':'Contacter SLKM sur WhatsApp'}><Brand name="whatsapp"/></a>;
}
