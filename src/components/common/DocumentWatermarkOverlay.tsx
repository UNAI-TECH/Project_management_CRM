import React from 'react';
import { DocumentBrandingTemplate } from '../../types';

interface DocumentWatermarkOverlayProps {
  branding?: DocumentBrandingTemplate;
  companyName?: string;
  logoUrl?: string;
  className?: string;
}

export const DocumentWatermarkOverlay: React.FC<DocumentWatermarkOverlayProps> = ({
  branding,
  companyName,
  logoUrl,
  className = '',
}) => {
  const isEnabled = branding?.watermark?.enabled ?? true;
  if (!isEnabled) return null;

  const wmType = branding?.watermark?.type || 'custom';
  const customType = branding?.watermark?.customType || 'text';
  const text = branding?.watermark?.text || companyName || 'CONFIDENTIAL';
  const customImageUrl = branding?.watermark?.customImageUrl;
  const isFaded = branding?.watermark?.isFaded ?? true;
  const opacityVal = (branding?.watermark?.opacity ?? 12) / 100;
  const orientation = branding?.watermark?.orientation || 'diagonal';
  const size = branding?.watermark?.size || 'md';

  const transformStyle: React.CSSProperties = {
    transform: orientation === 'horizontal' ? 'rotate(0deg)' : 'rotate(-30deg)',
    opacity: opacityVal,
  };

  const isImageWatermark =
    (wmType === 'logo' && (logoUrl || customImageUrl)) ||
    (wmType === 'custom' && customType === 'image' && (customImageUrl || logoUrl));
  const activeImage =
    wmType === 'custom' && customImageUrl ? customImageUrl : (logoUrl || customImageUrl);

  const getImageSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'max-w-[180px] max-h-[120px]';
      case 'lg':
        return 'max-w-[420px] max-h-[280px]';
      case 'xl':
        return 'max-w-[560px] max-h-[380px]';
      case 'md':
      default:
        return 'max-w-[300px] max-h-[200px]';
    }
  };

  const getTextSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-3xl sm:text-4xl';
      case 'lg':
        return 'text-6xl sm:text-7xl';
      case 'xl':
        return 'text-7xl sm:text-8xl';
      case 'md':
      default:
        return 'text-5xl sm:text-6xl';
    }
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      {isImageWatermark && activeImage ? (
        <div style={transformStyle} className="transition-transform duration-300">
          <img
            src={activeImage}
            alt="Company Watermark"
            className={`${getImageSizeClass()} object-contain ${
              isFaded ? 'grayscale contrast-75' : ''
            }`}
          />
        </div>
      ) : (
        <div
          style={transformStyle}
          className="transition-transform duration-300 max-w-[90%] text-center px-4"
        >
          <span
            className={`${getTextSizeClass()} font-black uppercase tracking-[0.25em] text-slate-500 leading-tight font-sans break-words select-none block`}
          >
            {text}
          </span>
        </div>
      )}
    </div>
  );
};
