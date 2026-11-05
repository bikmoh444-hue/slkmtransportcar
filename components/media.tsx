import Image from './resilient-image';
import { Bus, ImageIcon } from 'lucide-react';
export function Media({ src, mobileSrc, alt, hero = false, contain = false, focal = '50% 50%' }: {
    src?: string;
    mobileSrc?: string;
    alt: string;
    hero?: boolean;
    contain?: boolean;
    focal?: string;
    mobileFocal?: string;
}) {
    const image=src??mobileSrc;
    return <div className={`media ${contain ? 'contain' : ''} ${hero ? 'hero-media' : ''}`} style={{ '--focal': focal, '--mobile-focal': focal } as React.CSSProperties}>{image ? <Image src={image} alt={alt} fill sizes={hero ? '100vw' : '(max-width: 768px) 90vw, 50vw'} priority={hero} loading={hero ? 'eager' : 'lazy'}/>
         : <div className="media-empty" role="img" aria-label={alt}>
        <Bus size={hero ? 100 : 48} strokeWidth={1}/>
        <span>{alt}</span>
        <small>
        <ImageIcon size={13}/> SLKM</small>
        </div>}</div>;
}
