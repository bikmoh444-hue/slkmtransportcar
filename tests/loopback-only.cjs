// Loaded only by the isolated test child, never by application code.
const originalFetch=globalThis.fetch;
globalThis.fetch=function(input,init){
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new TypeError('External network blocked by isolated auth fixture');
 return originalFetch(input,init);
};
