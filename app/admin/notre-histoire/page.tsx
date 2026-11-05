import Admin from '../page';
export const dynamic = 'force-dynamic';
export const metadata = {title: 'SLKM / Administration / Notre histoire', robots: {index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){return <Admin searchParams={Promise.resolve({...await searchParams,section:'histoire'})}/>;}
