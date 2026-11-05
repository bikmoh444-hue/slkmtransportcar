import Admin from '../page';
export const dynamic = 'force-dynamic';
export const metadata={title:'SLKM / Administration',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{page?:string;q?:string;status?:string}>}){return <Admin searchParams={Promise.resolve({...await searchParams,section:'contact'})}/>;}
