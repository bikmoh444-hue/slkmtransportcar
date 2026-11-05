 'use client';
import {useAdminLanguage} from './admin-language';
export default function TrafficPlot({data}:{data:{day:string;visits:number}[]}) {
 const {t}=useAdminLanguage();const max=Math.max(2,...data.map(row=>row.visits));
 const points=data.map((row,index)=>`${40+index*700/Math.max(1,data.length-1)},${235-row.visits/max*205}`).join(' ');
 return <figure style={{margin:0}}><svg viewBox="0 0 780 280" role="img" aria-label={t('Statistiques des visites')} style={{width:'100%',maxHeight:300}}>
 {[0,.5,1].map(ratio=><g key={ratio}><line x1="40" x2="740" y1={235-ratio*205} y2={235-ratio*205} stroke="#E3E8EF"/><text x="32" y={240-ratio*205} textAnchor="end" fontSize="12" fill="currentColor">{Math.round(max*ratio)}</text></g>)}
 <polygon points={`40,235 ${points} 740,235`} fill="#08648B" fillOpacity=".1"/>
 <polyline points={points} fill="none" stroke="#08648B" strokeWidth="3"/>
 {data.filter((_,i)=>i===0||i===data.length-1).map((row,i)=><text key={row.day} x={i?740:40} y="265" textAnchor={i?'end':'start'} fontSize="12" fill="currentColor">{row.day}</text>)}
 </svg><details><summary>{t('Voir les données')}</summary><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t('Date')}</th><th>{t('Pages vues')}</th></tr></thead><tbody>{data.map(row=><tr key={row.day}><td>{row.day}</td><td>{row.visits}</td></tr>)}</tbody></table></div></details></figure>;
}
