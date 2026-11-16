import { useState } from 'react';
import { Church } from 'lucide-react';
import { SANCTUARY_IMAGES, type SanctuaryImageKey } from '../assets/sanctuaryImages';

interface SanctuaryImageProps {
  imageKey: SanctuaryImageKey;
  alt: string;
  className?: string;
}

export function SanctuaryImage({ imageKey, alt, className = '' }: SanctuaryImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EAE6DC] to-[#D8D1C4] dark:from-[#23201B] dark:to-[#181612] text-[#6E6A63] dark:text-[#A39E93] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Church className="w-8 h-8 mb-3 opacity-60" strokeWidth={1.25} />
        <span className="font-editorial text-sm">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={SANCTUARY_IMAGES[imageKey]}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
