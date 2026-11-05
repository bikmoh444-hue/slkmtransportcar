import test from 'node:test';
import assert from 'node:assert/strict';
import {themeData,themeStyle,themeDefaults,THEME_VERSION} from '../lib/theme.ts';
test('saved legacy Supabase palette cannot override the orange redesign',()=>{
 const legacy={yellow:'#F4E52C',blue:'#075AA6',deep_blue:'#073B73',orange:'#F58220',phone:'contact personnalisé',logo:'/media/original.webp'};
 const result=themeData(legacy);
 for(const [key,color] of Object.entries(themeDefaults))assert.equal(result[key],color);
 assert.equal(Object.hasOwn(result,'yellow'),false);assert.equal(Object.hasOwn(themeStyle(legacy),'--yellow'),false);
 assert.equal(result.phone,legacy.phone);assert.equal(result.logo,legacy.logo);
 assert.equal(themeData({...result,theme_version:THEME_VERSION,blue:'#07527A'}).blue,'#07527A');
 assert.equal(themeStyle(legacy)['--orange' as keyof React.CSSProperties],'#C46200');
});
