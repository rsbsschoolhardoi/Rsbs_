/**
 * ImageCropDialog – crop/position an image to the exact page aspect ratio.
 *
 * Uses react-easy-crop so the user can pan and zoom the source image inside
 * a crop area whose aspect ratio matches the current document dimensions.
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageCropDialogProps {
  open: boolean;
  imageUrl: string;
  /** Target width / height ratio derived from the current document */
  aspectRatio: number;
  onCancel: () => void;
  onConfirm: (croppedImageUrl: string) => void;
}

function getCroppedImageDataUrl(imageSrc: string, croppedAreaPixels: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
      );

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = imageSrc;
  });
}

export const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  open, imageUrl, aspectRatio, onCancel, onConfirm,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Reset state when a new image is opened
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageUrl]);

  const onCropComplete = useCallback((_croppedArea: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const dataUrl = await getCroppedImageDataUrl(imageUrl, croppedAreaPixels);
      onConfirm(dataUrl);
    } catch {
      // If cropping fails, fall back to the original image
      onConfirm(imageUrl);
    } finally {
      setProcessing(false);
    }
  }, [croppedAreaPixels, imageUrl, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onCancel(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl h-[90dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle className="text-sm font-bold">Crop Background Image</DialogTitle>
          <DialogDescription className="text-xs">
            Pan and zoom to frame the image inside the document area. The crop matches the current document ratio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 relative bg-muted">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid={false}
            style={{
              containerStyle: { background: 'transparent' },
              cropAreaStyle: { border: '2px dashed rgba(255,255,255,0.8)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' },
            }}
            onMediaLoaded={(mediaSize) => {
              // Keep a reference for reset if needed
              imageRef.current = mediaSize as unknown as HTMLImageElement;
            }}
          />

          {/* Floating zoom controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/90 border border-border/60 rounded-full px-2 py-1 shadow-lg z-10">
            <Button
              variant="ghost" size="icon" className="h-8 w-8 rounded-full"
              onClick={() => setZoom(z => Math.max(1, z - 0.1))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost" size="icon" className="h-8 w-8 rounded-full"
              onClick={() => setZoom(z => Math.min(3, z + 0.1))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8 rounded-full"
              onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/60 shrink-0">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!croppedAreaPixels || processing}>
            {processing ? 'Applying…' : 'Apply Background'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
