export class RequestBodyError extends Error {
  readonly status: 400 | 413;
  constructor(status: 400 | 413) { super('Invalid request body'); this.status=status; }
}

export async function readBoundedText(request:Request,limit:number):Promise<string> {
  const declared=request.headers.get('content-length');
  if(declared!==null) {
    if(!/^\d+$/.test(declared))throw new RequestBodyError(400);
    if(BigInt(declared)>BigInt(limit)) {
      if(request.body)void request.body.cancel().catch(()=>{});
      throw new RequestBodyError(413);
    }
  }
  if(!request.body)throw new RequestBodyError(400);
  const reader=request.body.getReader();
  const decoder=new TextDecoder('utf-8',{fatal:true});
  const parts:string[]=[];
  let bytes=0;
  try {
    for(;;) {
      const {done,value}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>limit)throw new RequestBodyError(413);
      if(value.byteLength) {const text=decoder.decode(value,{stream:true});if(text)parts.push(text)}
    }
    parts.push(decoder.decode());
    return parts.join('');
  } catch(error) {
    // Initiate cancellation without waiting indefinitely for a malicious sender.
    void reader.cancel().catch(()=>{});
    throw error instanceof RequestBodyError?error:new RequestBodyError(400);
  } finally {reader.releaseLock()}
}

export async function readBoundedJson(request:Request,limit:number):Promise<unknown> {
  const text=await readBoundedText(request,limit);
  try {return JSON.parse(text)}catch {throw new RequestBodyError(400)}
}
