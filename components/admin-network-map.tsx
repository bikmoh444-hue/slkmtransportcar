import {Editor} from './admin-editor';
import {AdminText} from './admin-language';
import type {RecordData} from '@/lib/model';

export function NetworkMapEditor({rows,mapKey}:{rows:RecordData[];mapKey:'voyageurs'|'messagerie'}) {
 const existing=rows.find(row=>row.key===mapKey);
 const row=existing||{
  id:'',key:mapKey,
  label_fr:mapKey==='voyageurs'?'Réseau de voyageurs SLKM':'Carte du réseau de messagerie',
  label_ar:mapKey==='voyageurs'?'شبكة نقل المسافرين SLKM':'خريطة شبكة نقل الطرود',
  data:{image:''},sort_order:mapKey==='voyageurs'?0:1,is_active:true,
 };
 return <div id={`carte-reseau-${mapKey}`}><p className="admin-muted"><AdminText>{'Choisissez la photo de la carte, puis cliquez sur Enregistrer pour remplir le cadre du site.'}</AdminText></p><Editor table="network_maps" rows={[row]} allowAdd={false}/></div>;
}
