import sharp from 'sharp';

export async function prepareRaster(file:File,purpose:unknown) {
  if(!file.size||file.size>8*1024*1024||!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw new Error('Invalid raster');
  const source=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:40000000});
  const metadata=await source.metadata();
  const actual=metadata.format==='heif'&&metadata.compression==='av1'?'image/avif':({jpeg:'image/jpeg',png:'image/png',webp:'image/webp'} as Record<string,string>)[metadata.format||''];
  // Sharp also decodes SVG/GIF/etc.; the declared MIME alone must not admit them.
  if(actual!==file.type)throw new Error('Invalid raster');
  const format=purpose==='favicon'?'png':'webp';
  const image=source.rotate().resize({width:2560,height:2560,fit:'inside',withoutEnlargement:true});
  const buffer=await (format==='png'?image.resize(128,128,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png():image.webp({quality:85})).toBuffer();
  if(buffer.length>8*1024*1024)throw new Error('Invalid raster');
  const info=await sharp(buffer).metadata();
  return {buffer,info,format,mime:format==='png'?'image/png':'image/webp'};
}
