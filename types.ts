export type Language = 'EN' | 'VIE';

export type Resolution = '1K' | '2K' | '4K';

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface ArcState {
  azimuth: number; // -180 to 180 degrees (Horizontal)
  elevation: number; // -90 to 90 degrees (Vertical)
  roll: number; // -180 to 180 degrees (Tilt/Roll)
}

export interface ImageState {
  file: File | null;
  previewUrl: string | null;
  base64: string | null;
}

export interface GeneratedResult {
  imageUrl: string;
  azimuth: number;
  elevation: number;
  roll: number;
  zoom: number;
  resolution: Resolution;
  aspectRatio: AspectRatio;
  shotType?: string;
  timestamp: number;
}