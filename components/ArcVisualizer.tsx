import React, { useRef, useEffect, useState } from 'react';
import { MousePointer2, RefreshCcw, Hand, ZoomIn } from 'lucide-react';
import { AspectRatio } from '../types';

interface ArcVisualizerProps {
  imagePreview: string | null;
  azimuth: number;
  elevation: number;
  roll: number;
  zoom: number;
  aspectRatio: AspectRatio;
  onAngleChange: (azimuth: number, elevation: number, roll: number) => void;
  onZoomChange: (zoom: number) => void;
  dragHintText: string;
  rotatingText: string;
}

// A 3D wireframe human figure for the default state
const HumanWireframe: React.FC = () => (
  <svg viewBox="0 0 100 200" className="w-full h-full text-zinc-500 opacity-50">
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="50" cy="30" r="15" className="fill-zinc-500/10" />
      <path d="M50 45 V 45" /> 
      <path d="M50 45 L 50 110" /> 
      <path d="M30 55 L 70 55" /> 
      <path d="M30 55 L 50 110 L 70 55" className="opacity-50" /> 
      <path d="M30 55 L 20 80 L 15 100" /> 
      <path d="M70 55 L 80 80 L 85 100" /> 
      <path d="M35 110 L 65 110" /> 
      <path d="M35 110 L 30 150 L 25 190" /> 
      <path d="M65 110 L 70 150 L 75 190" /> 
      <circle cx="50" cy="45" r="2" fill="currentColor" />
      <circle cx="30" cy="55" r="2" fill="currentColor" />
      <circle cx="70" cy="55" r="2" fill="currentColor" />
      <circle cx="50" cy="110" r="2" fill="currentColor" />
    </g>
  </svg>
);

// Renders the image as a stack of layers to simulate 3D volume, but keeps original colors
const VolumetricStack: React.FC<{ src: string | null }> = ({ src }) => {
    // Create 12 layers for depth
    const layers = Array.from({ length: 12 }, (_, i) => i - 6); 
    
    return (
        <div className="relative w-full h-full preserve-3d">
            {/* Base Projector Light - Subtle now */}
            <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 w-40 h-40 opacity-20 pointer-events-none transform rotate-x-90">
                <div className="w-full h-full rounded-full bg-white blur-xl" />
            </div>

            {/* The Volumetric Stack */}
            {layers.map((zOffset, index) => {
                // Calculate opacity: Main layer is full, others are ghosts for depth
                const isMain = zOffset === 0;
                const opacity = isMain ? 1 : 0.15; // Lower opacity for back layers to avoid muddying

                return (
                    <div 
                        key={index}
                        className="absolute inset-0 flex items-center justify-center backface-visible pointer-events-none"
                        style={{
                            transform: `translateZ(${zOffset * 2}px)`, // Tighter spacing
                        }}
                    >
                       {src ? (
                            <img 
                                src={src}
                                alt=""
                                className={`w-full h-full object-contain ${!isMain ? 'grayscale contrast-150' : ''}`} // Make depth layers grayscale to emphasize form without color bleed
                                style={{ 
                                    opacity: opacity,
                                }}
                            />
                       ) : (
                           <div className="w-3/4 h-3/4 opacity-80" style={{ opacity: isMain ? 0.8 : 0.1 }}>
                               <HumanWireframe />
                           </div>
                       )}
                    </div>
                );
            })}
        </div>
    );
};

export const ArcVisualizer: React.FC<ArcVisualizerProps> = ({ 
    imagePreview, 
    azimuth, 
    elevation, 
    roll,
    zoom,
    aspectRatio,
    onAngleChange, 
    onZoomChange,
    dragHintText,
    rotatingText
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startAngles, setStartAngles] = useState({ azi: 0, elev: 0 });

  // --- Zoom Logic (Mouse Wheel) ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.2, zoom + delta), 2.5); // Allow zooming out more (0.2)
    onZoomChange(newZoom);
  };

  // --- Drag Logic ---
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setStartPos({ x: clientX, y: clientY });
    setStartAngles({ azi: azimuth, elev: elevation });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); 
    handleStart(e.clientX, e.clientY);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const pxPerDegree = 2.5; 
    const deltaX = clientX - startPos.x;
    const deltaY = clientY - startPos.y;

    const newAzimuth = Math.round(startAngles.azi - (deltaX / pxPerDegree));
    const newElevation = Math.round(startAngles.elev + (deltaY / pxPerDegree));
    
    const clampedElevation = Math.max(-90, Math.min(90, newElevation));

    // Keep roll constant during drag
    onAngleChange(newAzimuth, clampedElevation, roll);
  };

  const handleEnd = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      const onMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
      const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
      const onUp = () => handleEnd();

      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchend', onUp);

      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchend', onUp);
      };
    }
  }, [isDragging]);

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAngleChange(0, 0, 0); // Reset roll too
    onZoomChange(1);
  };

  // --- Aspect Ratio Calc for Viewfinder ---
  const getAspectRatioStyle = () => {
      // Default container reference size is around 450px height. 
      // We want to calculate a percentage-based width/height that fits inside.
      switch (aspectRatio) {
          case '1:1': return { width: '80%', aspectRatio: '1/1' };
          case '16:9': return { width: '95%', aspectRatio: '16/9' };
          case '9:16': return { height: '90%', aspectRatio: '9/16' };
          case '4:3': return { width: '85%', aspectRatio: '4/3' };
          case '3:4': return { height: '85%', aspectRatio: '3/4' };
          default: return { width: '80%', aspectRatio: '1/1' };
      }
  };

  const { hName, vName, dName } = (() => {
    const normAz = ((azimuth % 360) + 360) % 360;
    let hName = "";
    if (normAz <= 15 || normAz >= 345) hName = "Front View";
    else if (normAz > 15 && normAz < 75) hName = "Front 3/4 View";
    else if (normAz >= 75 && normAz <= 105) hName = "Right Profile";
    else if (normAz > 105 && normAz < 165) hName = "Rear 3/4 View";
    else if (normAz >= 165 && normAz <= 195) hName = "Back View";
    else if (normAz > 195 && normAz < 255) hName = "Rear 3/4 View";
    else if (normAz >= 255 && normAz <= 285) hName = "Left Profile";
    else hName = "Front 3/4 View";

    let vName = "Eye Level";
    if (elevation > 60) vName = "Bird's Eye (Top Down)";
    else if (elevation > 30) vName = "High Angle";
    else if (elevation < -60) vName = "Worm's Eye (Bottom Up)";
    else if (elevation < -30) vName = "Low Angle";

    let dName = "";
    if (zoom > 1.5) dName = "Close-up";
    else if (zoom < 0.4) dName = "Extreme Wide / Drone"; // New Context for drone
    else if (zoom < 0.7) dName = "Wide Shot";

    return { hName, vName, dName };
  })();

  return (
    <div className="flex flex-col gap-4 select-none relative">
        {/* Main 3D Viewport */}
        <div 
            className={`
                relative h-[450px] bg-[#0c0c0e] rounded-xl overflow-hidden border border-zinc-800 shadow-2xl group
                ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                flex items-center justify-center
            `}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onWheel={handleWheel}
            ref={containerRef}
        >
            {/* Grid Floor */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden perspective-container pointer-events-none">
                <div 
                    className="absolute w-[300%] h-[300%] opacity-20"
                    style={{
                        background: 'radial-gradient(circle, #71717a 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                        transform: `perspective(800px) rotateX(${60 - elevation}deg) rotateZ(${azimuth}deg) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                    }}
                />
            </div>

            {/* 3D Scene Container */}
            <div className="absolute inset-0 flex items-center justify-center perspective-1000 pointer-events-none">
                <div 
                    className="relative w-48 h-64 md:w-64 md:h-80 preserve-3d transition-transform duration-75"
                    style={{
                        transformStyle: 'preserve-3d',
                        // Inverse rotations to simulate camera movement properly. 
                        // Roll (rotateZ) applied to object creates camera tilt effect.
                        transform: `rotateX(${-elevation}deg) rotateY(${-azimuth}deg) rotateZ(${-roll}deg) scale(${zoom})`,
                    }}
                >
                    <VolumetricStack src={imagePreview} />
                </div>
            </div>

            {/* VIRTUAL FRAME (VIEWFINDER) OVERLAY - Dynamically Resizes */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                 <div 
                    className="relative border border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-all duration-300"
                    style={getAspectRatioStyle()}
                 >
                     {/* Rule of Thirds Grid - Subtle */}
                     <div className="w-full h-full flex flex-col">
                         <div className="flex-1 border-b border-white/5 flex">
                             <div className="flex-1 border-r border-white/5"></div>
                             <div className="flex-1 border-r border-white/5"></div>
                             <div className="flex-1"></div>
                         </div>
                         <div className="flex-1 border-b border-white/5 flex">
                             <div className="flex-1 border-r border-white/5"></div>
                             <div className="flex-1 border-r border-white/5"></div>
                             <div className="flex-1"></div>
                         </div>
                         <div className="flex-1 flex">
                             <div className="flex-1 border-r border-white/5"></div>
                             <div className="flex-1 border-r border-white/5"></div>
                             <div className="flex-1"></div>
                         </div>
                     </div>
                     
                     {/* Corner Brackets */}
                     <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                     <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                     <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                     <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white"></div>

                     {/* Ratio Label */}
                     <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-[10px] text-white font-mono rounded">
                         {aspectRatio}
                     </div>
                 </div>
                 
                 {/* Center Crosshair */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-20">
                     <div className="w-8 h-[1px] bg-white"></div>
                     <div className="h-8 w-[1px] bg-white absolute"></div>
                 </div>
            </div>

            {/* HUD: Camera Angles Overlay */}
            <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2 z-10">
                <div className="flex flex-col items-start px-3 py-2 bg-zinc-900/80 backdrop-blur rounded-lg border-l-2 border-purple-500 shadow-xl">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Current Shot</span>
                    <span className="text-sm text-white font-medium leading-tight">{vName}</span>
                    <span className="text-xs text-zinc-300">{hName}</span>
                    {dName && <span className="text-xs text-cyan-300 font-mono mt-0.5">{dName}</span>}
                    {Math.abs(roll) > 1 && <span className="text-xs text-yellow-500 font-mono mt-0.5">Tilt: {roll}°</span>}
                </div>
            </div>

            {/* ZOOM SLIDER - Fixed Implementation */}
            <div 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 py-4 px-1 flex flex-col items-center gap-4 shadow-xl z-20"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                <ZoomIn size={16} className="text-zinc-400" />
                
                {/* Slider Track Container - Centers the input to handle rotation origin correctly */}
                <div className="relative w-6 h-[160px] flex items-center justify-center">
                     <input 
                        type="range" 
                        min="0.2" 
                        max="2.5" 
                        step="0.1"
                        value={zoom} 
                        onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                        className="
                            absolute w-[160px] h-6 
                            bg-transparent 
                            appearance-none cursor-pointer 
                            -rotate-90 origin-center
                            outline-none
                            
                            /* Webkit Slider Thumb */
                            [&::-webkit-slider-thumb]:appearance-none 
                            [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:h-4 
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-white 
                            [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,0.1)]
                            [&::-webkit-slider-thumb]:mt-[-6px] 
                            hover:[&::-webkit-slider-thumb]:scale-110
                            
                            /* Webkit Slider Runable Track */
                            [&::-webkit-slider-runnable-track]:w-full
                            [&::-webkit-slider-runnable-track]:h-1
                            [&::-webkit-slider-runnable-track]:bg-zinc-600
                            [&::-webkit-slider-runnable-track]:rounded-full
                        "
                    />
                </div>
                
                <div className="text-[10px] font-mono text-cyan-400 font-bold">{zoom.toFixed(1)}x</div>
            </div>

            {/* Interaction Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2 z-10">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3 shadow-lg">
                    {isDragging ? (
                         <Hand size={14} className="text-white" />
                    ) : (
                         <MousePointer2 size={14} className="text-zinc-400" />
                    )}
                    <span className="text-xs text-zinc-200 font-medium whitespace-nowrap">
                        {isDragging ? rotatingText : dragHintText}
                    </span>
                </div>
            </div>
            
            {/* Reset Button */}
             <button 
                onClick={handleReset}
                className="absolute top-4 right-16 p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg backdrop-blur border border-white/10 shadow-lg transition-colors pointer-events-auto z-10"
                title="Reset View"
             >
                <RefreshCcw size={16} />
             </button>
        </div>

        <style jsx>{`
            .perspective-1000 {
                perspective: 1000px;
            }
            .preserve-3d {
                transform-style: preserve-3d;
            }
            .backface-visible {
                backface-visibility: visible;
            }
        `}</style>
    </div>
  );
};