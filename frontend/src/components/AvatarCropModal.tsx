import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export const AvatarCropModal = ({ file, onConfirm, onCancel }: Props) => {
  const [imgSrc, setImgSrc] = useState('');
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);
  // center is normalized [0,1] over the image display area
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalW(img.naturalWidth);
    setNaturalH(img.naturalHeight);
    setDisplayW(img.offsetWidth);
    setDisplayH(img.offsetHeight);
    setCenter({ x: 0.5, y: 0.5 });
  };

  // cropSize in natural pixels = min dimension of the image
  const cropNatural = Math.min(naturalW, naturalH);
  // half-fractions for clamping center so crop stays inside the image
  const halfFracW = naturalW > 0 ? (cropNatural / naturalW) / 2 : 0.5;
  const halfFracH = naturalH > 0 ? (cropNatural / naturalH) / 2 : 0.5;
  // scale: display pixels per natural pixel
  const scale = naturalW > 0 ? displayW / naturalW : 1;
  const cropDisplay = cropNatural * scale; // circle diameter in display px

  // Top-left of circle in display px
  const circleLeft = center.x * displayW - cropDisplay / 2;
  const circleTop = center.y * displayH - cropDisplay / 2;

  const updateCenterFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el || naturalW === 0) return;
      const rect = el.getBoundingClientRect();
      const rawX = (clientX - rect.left) / rect.width;
      const rawY = (clientY - rect.top) / rect.height;
      setCenter({
        x: Math.max(halfFracW, Math.min(1 - halfFracW, rawX)),
        y: Math.max(halfFracH, Math.min(1 - halfFracH, rawY)),
      });
    },
    [naturalW, halfFracW, halfFracH]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    containerRef.current?.setPointerCapture(e.pointerId);
    updateCenterFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateCenterFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || naturalW === 0) return;
    const sx = Math.round(center.x * naturalW - cropNatural / 2);
    const sy = Math.round(center.y * naturalH - cropNatural / 2);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, sx, sy, cropNatural, cropNatural, 0, 0, 256, 256);
    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, 'image/jpeg', 0.85);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Choose crop area</h3>
        <p className="text-sm text-gray-500 mb-4">Click or drag to set where you want the center of your avatar.</p>

        {/* Image container — pointer events for drag */}
        <div
          ref={containerRef}
          className="relative rounded-xl overflow-hidden bg-gray-100 select-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          <img
            ref={imgRef}
            src={imgSrc}
            alt="Crop preview"
            className="w-full block"
            style={{ imageOrientation: 'from-image', userSelect: 'none', pointerEvents: 'none' }}
            onLoad={handleImageLoad}
            draggable={false}
          />

          {/* Dark overlay with circular cutout */}
          {cropDisplay > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle ${cropDisplay / 2}px at ${circleLeft + cropDisplay / 2}px ${circleTop + cropDisplay / 2}px, transparent ${cropDisplay / 2 - 1}px, rgba(0,0,0,0.55) ${cropDisplay / 2}px)`,
              }}
            />
          )}

          {/* Circle border */}
          {cropDisplay > 0 && (
            <div
              className="absolute rounded-full border-2 border-white pointer-events-none"
              style={{
                left: circleLeft,
                top: circleTop,
                width: cropDisplay,
                height: cropDisplay,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
              }}
            />
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={handleConfirm} className="btn btn-primary flex-1">Upload</button>
        </div>
      </div>
    </div>
  );
};
