'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {contentUpdatedEvent} from '@/lib/content-events';

// Refresh when returning from the dashboard, without polling or reloading the page.
export function PublicContentRefresh() {
 const router=useRouter();
 useEffect(()=>{
  let pending:ReturnType<typeof setTimeout>|undefined;
  const schedule=()=>{clearTimeout(pending);pending=setTimeout(()=>router.refresh(),150)};
  const refresh=()=>{if(document.visibilityState==='visible')schedule()};
  const saved=(event:StorageEvent)=>{if(event.key===contentUpdatedEvent)schedule()};
  const restore=(event:PageTransitionEvent)=>{if(event.persisted)refresh()};
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('pageshow',restore);
  window.addEventListener('storage',saved);
  window.addEventListener(contentUpdatedEvent,schedule);
  return()=>{clearTimeout(pending);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('pageshow',restore);window.removeEventListener('storage',saved);window.removeEventListener(contentUpdatedEvent,schedule)};
 },[router]);
 return null;
}
