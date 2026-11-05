import Admin from '../page';
export const dynamic = 'force-dynamic';
export const metadata = {title: 'SLKM / Administration / Paramètres', robots: {index:false,follow:false}};
export default async function Page(){return <Admin searchParams={Promise.resolve({section:'site_settings'})}/>;}
