'use client';

import Image, {type ImageProps} from 'next/image';
import {useState} from 'react';

// Uploaded files are already resized and compressed. If the image optimizer
// cannot fetch one, the browser can still load the public Storage URL directly.
export default function ResilientImage({src, unoptimized, onError, ...props}: ImageProps) {
  const [failedSource, setFailedSource] = useState<ImageProps['src']>();
  return <Image {...props} src={src} unoptimized={unoptimized || failedSource === src}
    onError={event => {setFailedSource(src); onError?.(event);}}/>;
}
