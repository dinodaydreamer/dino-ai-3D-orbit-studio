import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, Loader2, Image as ImageIcon, Sparkles, ChevronRight, Info, Rotate3d, FileUp, Globe, Key, HelpCircle, X, Camera, Monitor, RectangleHorizontal } from 'lucide-react';
import { ArcVisualizer } from './components/ArcVisualizer';
import { generateRotatedView } from './services/geminiService';
import type { ImageState, GeneratedResult, Language, Resolution, AspectRatio } from './types';

// Localization Dictionary
const TEXTS = {
  EN: {
    title: "DINO AI MEDIA",
    docs: "User Guide",
    apiKeyPlaceholder: "Enter Gemini API Key",
    sourceObject: "Source Object",
    replaceObject: "Replace Object",
    dropText: "Drop image to analyze",
    clickDragText: "Click or Drag image here",
    orbitStudio: "3D Orbit Studio",
    dragHint: "Drag to Rotate • Use Zoom Bar",
    rotating: "Rotating...",
    azimuth: "Azimuth (Horizontal)",
    elevation: "Elevation (Vertical)",
    roll: "Roll (Tilt)",
    generateBtn: "Generate View",
    generating: "Synthesizing New View...",
    generatedAngles: "Generated Angles",
    noViews: "No views generated yet",
    noViewsHint: "Rotate the model and click Generate",
    download: "Download",
    errorSize: "File size too large. Please upload an image under 5MB.",
    errorType: "Please drop a valid image file.",
    errorGen: "Failed to generate. Check API Key and try again.",
    missingKey: "Please enter your Gemini API Key in the top right corner.",
    guideTitle: "How to use",
    guideStep1: "1. Enter your Gemini API Key in the top right menu.",
    guideStep2: "2. Upload an image of an object or person.",
    guideStep3: "3. Drag the 3D viewer to find the desired angle.",
    guideStep4: "4. Click 'Generate' to create a new view using AI.",
    note: "Note: The API Key is stored locally in your browser.",
    resolution: "Resolution",
    aspectRatio: "Aspect Ratio",
    presets: "Cinematic Shots",
    presetLabels: {
        eyeLevel: "Eye-Level",
        lowAngle: "Low Angle",
        highAngle: "High Angle",
        birdEye: "Bird's Eye",
        wormEye: "Worm's Eye",
        wide: "Wide Shot",
        medium: "Medium Shot",
        closeUp: "Close-up",
        ecu: "Extreme CU",
        dutch: "Dutch Angle",
        ots: "OTS",
        pov: "POV",
        // New Presets
        drone: "Drone View",
        face: "Face Close-up",
        fisheye: "Fisheye",
        macro: "Macro Detail",
        isometric: "Isometric",
        panorama: "Panorama"
    }
  },
  VIE: {
    title: "DINO AI MEDIA",
    docs: "Hướng dẫn sử dụng",
    apiKeyPlaceholder: "Nhập API Key Gemini",
    sourceObject: "Đối tượng gốc",
    replaceObject: "Thay đổi ảnh",
    dropText: "Thả ảnh để phân tích",
    clickDragText: "Click hoặc Kéo ảnh vào đây",
    orbitStudio: "Studio Xoay 3D",
    dragHint: "Kéo để Xoay • Dùng thanh Zoom",
    rotating: "Đang xoay...",
    azimuth: "Góc ngang (Azimuth)",
    elevation: "Góc dọc (Elevation)",
    roll: "Góc nghiêng (Roll)",
    generateBtn: "Tạo ảnh",
    generating: "Đang tổng hợp góc nhìn mới...",
    generatedAngles: "Các góc đã tạo",
    noViews: "Chưa có ảnh nào được tạo",
    noViewsHint: "Xoay mô hình và nhấn nút Tạo",
    download: "Tải xuống",
    errorSize: "File quá lớn. Vui lòng tải ảnh dưới 5MB.",
    errorType: "Vui lòng thả file ảnh hợp lệ.",
    errorGen: "Tạo ảnh thất bại. Kiểm tra API Key và thử lại.",
    missingKey: "Vui lòng nhập API Key Gemini ở góc phải màn hình.",
    guideTitle: "Hướng dẫn sử dụng",
    guideStep1: "1. Nhập API Key Gemini của bạn ở menu góc phải.",
    guideStep2: "2. Tải lên một ảnh chứa đối tượng hoặc nhân vật.",
    guideStep3: "3. Kéo thả vùng 3D để chọn góc nhìn mong muốn.",
    guideStep4: "4. Nhấn 'Tạo ảnh' để AI vẽ lại góc nhìn mới.",
    note: "Lưu ý: API Key được lưu cục bộ trên trình duyệt của bạn.",
    resolution: "Độ phân giải",
    aspectRatio: "Tỉ lệ khung hình",
    presets: "Góc quay điện ảnh",
    presetLabels: {
        eyeLevel: "Ngang tầm mắt",
        lowAngle: "Góc thấp",
        highAngle: "Góc cao",
        birdEye: "Góc trên cao",
        wormEye: "Góc sát đất",
        wide: "Toàn cảnh",
        medium: "Trung cảnh",
        closeUp: "Cận cảnh",
        ecu: "Siêu cận",
        dutch: "Góc nghiêng",
        ots: "Qua vai",
        pov: "Góc nhìn thứ nhất",
        // New Presets
        drone: "Flycam (Drone)",
        face: "Cận cảnh mặt",
        fisheye: "Mắt cá (Fisheye)",
        macro: "Macro (Chi tiết)",
        isometric: "Isometric 3D",
        panorama: "Panorama"
    }
  }
};

interface Preset {
    id: string;
    labelKey: keyof typeof TEXTS.EN.presetLabels;
    azi?: number;
    elev?: number;
    roll?: number;
    zoom?: number;
    shotType?: string; // Additional prompting context
}

const PRESETS: Preset[] = [
    { id: 'eye', labelKey: 'eyeLevel', elev: 0, zoom: 1, roll: 0 },
    { id: 'low', labelKey: 'lowAngle', elev: -35, zoom: 1, roll: 0 },
    { id: 'high', labelKey: 'highAngle', elev: 35, zoom: 1, roll: 0 },
    { id: 'bird', labelKey: 'birdEye', elev: 75, zoom: 0.8, roll: 0 },
    { id: 'worm', labelKey: 'wormEye', elev: -75, zoom: 0.9, roll: 0 },
    
    // New 6 Presets integrated naturally
    // Updated Drone View: Higher elevation (75) and much wider zoom (0.3) for "High Altitude/Vast Scene"
    { id: 'drone', labelKey: 'drone', elev: 75, zoom: 0.3, shotType: 'Drone View', roll: 0 },
    { id: 'iso', labelKey: 'isometric', azi: 45, elev: 35, zoom: 0.9, shotType: 'Isometric', roll: 0 },
    
    { id: 'wide', labelKey: 'wide', zoom: 0.6, roll: 0 },
    { id: 'med', labelKey: 'medium', zoom: 1.0, roll: 0 },
    { id: 'cu', labelKey: 'closeUp', zoom: 1.5, roll: 0 },
    { id: 'face', labelKey: 'face', zoom: 2.2, elev: 0, shotType: 'Face Close-up', roll: 0 },
    { id: 'ecu', labelKey: 'ecu', zoom: 2.2, roll: 0 },
    { id: 'macro', labelKey: 'macro', zoom: 2.5, shotType: 'Macro', roll: 0 },

    // Dutch angle applies a visible tilt (roll)
    { id: 'dutch', labelKey: 'dutch', shotType: 'Dutch Angle', roll: -15, zoom: 1.1 },
    { id: 'fish', labelKey: 'fisheye', zoom: 0.7, shotType: 'Fisheye', roll: 0 },
    { id: 'pano', labelKey: 'panorama', zoom: 0.5, shotType: 'Panorama', roll: 0 },
    { id: 'ots', labelKey: 'ots', zoom: 1.2, shotType: 'Over-the-Shoulder Shot', roll: 0 },
    { id: 'pov', labelKey: 'pov', zoom: 1.1, shotType: 'POV Shot', roll: 0 },
];

function App() {
  const [lang, setLang] = useState<Language>(() => {
      return (localStorage.getItem('dino_lang') as Language) || 'EN';
  });
  
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('dino_api_key') || '');
  const [showGuide, setShowGuide] = useState(false);

  const t = TEXTS[lang];

  const [sourceImage, setSourceImage] = useState<ImageState>({ file: null, previewUrl: null, base64: null });
  
  // Angle & Camera State
  const [azimuth, setAzimuth] = useState(0); 
  const [elevation, setElevation] = useState(0); 
  const [roll, setRoll] = useState(0);
  const [zoom, setZoom] = useState(1); 
  
  // Generation Options
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [activeShotType, setActiveShotType] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      localStorage.setItem('dino_lang', lang);
  }, [lang]);

  useEffect(() => {
      localStorage.setItem('dino_api_key', apiKey);
  }, [apiKey]);

  const toggleLang = () => setLang(prev => prev === 'EN' ? 'VIE' : 'EN');

  const processFile = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError(t.errorSize);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        setSourceImage({
            file,
            previewUrl: URL.createObjectURL(file),
            base64: reader.result as string,
        });
        setResults([]);
        setAzimuth(0);
        setElevation(0);
        setRoll(0);
        setZoom(1);
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processFile(file);
    } else {
        setError(t.errorType);
    }
  };

  const applyPreset = (preset: Preset) => {
      if (preset.elev !== undefined) setElevation(preset.elev);
      if (preset.azi !== undefined) setAzimuth(preset.azi);
      if (preset.roll !== undefined) setRoll(preset.roll);
      if (preset.zoom !== undefined) setZoom(preset.zoom);
      
      // Update the explicit shot type (e.g. Dutch Angle)
      setActiveShotType(preset.shotType || '');
  };

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
        setError(t.missingKey);
        return;
    }
    if (!sourceImage.base64) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const generatedImageBase64 = await generateRotatedView(
          apiKey, 
          sourceImage.base64, 
          azimuth, 
          elevation, 
          roll,
          zoom, 
          resolution, 
          aspectRatio,
          activeShotType
      );
      
      const newResult: GeneratedResult = {
        imageUrl: generatedImageBase64,
        azimuth: azimuth,
        elevation: elevation,
        roll: roll,
        zoom: zoom,
        resolution: resolution,
        aspectRatio: aspectRatio,
        shotType: activeShotType,
        timestamp: Date.now()
      };

      setResults(prev => [newResult, ...prev]);
    } catch (err) {
      setError(t.errorGen);
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const getLabel = (res: GeneratedResult) => {
    let hLabel = 'Center';
    if (Math.abs(res.azimuth) > 10) hLabel = res.azimuth > 0 ? 'Right' : 'Left';
    
    let vLabel = 'Eye';
    if (res.elevation > 15) vLabel = 'High';
    if (res.elevation > 60) vLabel = 'Top';
    if (res.elevation < -15) vLabel = 'Low';
    if (res.elevation < -60) vLabel = 'Worm';

    if (res.shotType) return res.shotType;

    return `${hLabel} ${Math.abs(res.azimuth)}° • ${vLabel}`;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-inter">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-700 rounded-lg flex items-center justify-center shadow-lg shadow-green-900/20">
              <Rotate3d size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              {t.title}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Guide Button */}
            <button 
                onClick={() => setShowGuide(true)} 
                className="hidden md:flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
            >
                <HelpCircle size={16}/>
                {t.docs}
            </button>

            {/* Language Switch */}
            <button 
                onClick={toggleLang}
                className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 rounded text-xs font-semibold text-zinc-300 hover:text-white transition-colors border border-zinc-700"
            >
                <Globe size={14} />
                {lang}
            </button>

            {/* API Key Input */}
            <div className="relative group flex items-center">
                <div className="hidden md:block absolute right-0 top-full mt-2 w-64 bg-zinc-800 p-2 rounded shadow-xl border border-zinc-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                     <p className="text-[10px] text-zinc-400 mb-1">{t.note}</p>
                </div>
                <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-md overflow-hidden focus-within:border-emerald-500 transition-colors">
                    <div className="px-2 text-zinc-500">
                        <Key size={14} />
                    </div>
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={t.apiKeyPlaceholder}
                        className="bg-transparent border-none outline-none text-xs text-white w-32 md:w-48 h-8 placeholder-zinc-600"
                    />
                </div>
            </div>
          </div>
        </div>
      </header>

      {/* Guide Modal */}
      {showGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
                  <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                      <X size={20} />
                  </button>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <HelpCircle size={24} className="text-emerald-500" />
                      {t.guideTitle}
                  </h3>
                  <ul className="space-y-3 text-zinc-300 text-sm">
                      <li>{t.guideStep1}</li>
                      <li>{t.guideStep2}</li>
                      <li>{t.guideStep3}</li>
                      <li>{t.guideStep4}</li>
                  </ul>
                  <p className="mt-6 text-xs text-zinc-500 border-t border-zinc-800 pt-4">
                      {t.note}
                  </p>
              </div>
          </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input & Controls */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* Upload Section with Drag & Drop */}
          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <ImageIcon size={20} className="text-emerald-500"/> 
                    {t.sourceObject}
                </h2>
                {sourceImage.file && (
                    <button onClick={triggerUpload} className="text-xs text-emerald-400 hover:text-emerald-300">
                        {t.replaceObject}
                    </button>
                )}
             </div>

            {!sourceImage.previewUrl ? (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerUpload}
                className={`
                    group relative h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 overflow-hidden transition-all cursor-pointer
                    ${isDraggingOver 
                        ? 'border-emerald-500 bg-emerald-500/10' 
                        : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-emerald-500/50'}
                `}
              >
                <div className={`p-4 rounded-full transition-colors ${isDraggingOver ? 'bg-emerald-500/20' : 'bg-zinc-800 group-hover:bg-emerald-500/10'}`}>
                  {isDraggingOver ? (
                      <FileUp size={24} className="text-emerald-400" />
                  ) : (
                      <Upload size={24} className="text-zinc-400 group-hover:text-emerald-400" />
                  )}
                </div>
                <div className="text-center z-10">
                  <p className={`text-sm font-medium ${isDraggingOver ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {isDraggingOver ? t.dropText : t.clickDragText}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Supports PNG, JPG up to 5MB</p>
                </div>
              </div>
            ) : (
                <div className="relative h-48 rounded-2xl overflow-hidden border border-zinc-800 bg-black/50 group">
                    <img src={sourceImage.previewUrl!} alt="Source" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                        <button onClick={triggerUpload} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-md text-sm font-medium transition-all">
                            {t.replaceObject}
                        </button>
                    </div>
                </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </section>

          {/* 3D Arc Studio */}
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles size={20} className="text-purple-500"/> 
                    {t.orbitStudio}
                </h2>
                
                <div className="flex gap-2">
                     {/* Aspect Ratio Selector */}
                     <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1 items-center">
                         <div className="px-2 text-zinc-500"><RectangleHorizontal size={14}/></div>
                         {(['1:1', '16:9', '9:16', '4:3', '3:4'] as AspectRatio[]).map((ratio) => (
                             <button
                                 key={ratio}
                                 onClick={() => setAspectRatio(ratio)}
                                 className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${
                                     aspectRatio === ratio 
                                         ? 'bg-zinc-700 text-white shadow' 
                                         : 'text-zinc-500 hover:text-zinc-300'
                                 }`}
                             >
                                 {ratio}
                             </button>
                         ))}
                     </div>

                    {/* Resolution Selector */}
                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1 items-center">
                        <div className="px-2 text-zinc-500"><Monitor size={14}/></div>
                        {(['1K', '2K', '4K'] as Resolution[]).map((res) => (
                            <button
                                key={res}
                                onClick={() => setResolution(res)}
                                className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${
                                    resolution === res 
                                        ? 'bg-zinc-700 text-white shadow' 
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                {res}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <ArcVisualizer 
                imagePreview={sourceImage.previewUrl} 
                azimuth={azimuth}
                elevation={elevation}
                roll={roll}
                zoom={zoom}
                aspectRatio={aspectRatio}
                onAngleChange={(a, e, r) => {
                    setAzimuth(a);
                    setElevation(e);
                    setRoll(r);
                }}
                onZoomChange={(z) => setZoom(z)}
                dragHintText={t.dragHint}
                rotatingText={t.rotating}
            />

            {/* Presets Grid */}
            <div className="space-y-2">
                 <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                     <Camera size={12} /> {t.presets}
                 </div>
                 <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                     {PRESETS.map(preset => (
                         <button
                             key={preset.id}
                             onClick={() => applyPreset(preset)}
                             className={`
                                flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] font-medium transition-all text-center h-16
                                ${activeShotType === preset.shotType && (preset.shotType || '') !== '' 
                                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' 
                                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 hover:text-zinc-200'}
                             `}
                         >
                             <span>{t.presetLabels[preset.labelKey]}</span>
                         </button>
                     ))}
                 </div>
            </div>

            {/* Manual Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-zinc-500">{t.azimuth}</span>
                        <span className="text-lg font-mono text-cyan-400 font-semibold">{azimuth}°</span>
                    </div>
                    <input 
                        type="range" min="-180" max="180" 
                        value={((azimuth + 180) % 360) - 180} 
                        onChange={(e) => setAzimuth(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                    />
                </div>
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-zinc-500">{t.elevation}</span>
                        <span className="text-lg font-mono text-purple-400 font-semibold">{elevation}°</span>
                    </div>
                    <input 
                        type="range" min="-90" max="90" 
                        value={elevation}
                        onChange={(e) => setElevation(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                    />
                </div>
                 <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-zinc-500">{t.roll}</span>
                        <span className="text-lg font-mono text-yellow-500 font-semibold">{roll}°</span>
                    </div>
                    <input 
                        type="range" min="-180" max="180" 
                        value={roll}
                        onChange={(e) => setRoll(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500 hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                    />
                </div>
            </div>

            {/* Generate Button */}
            <button
                disabled={!sourceImage.base64 || isGenerating}
                onClick={handleGenerate}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-white shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] relative overflow-hidden"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        {t.generating}
                    </>
                ) : (
                    <>
                        <span className="absolute left-4 text-[10px] font-mono opacity-50 bg-black/20 px-2 py-0.5 rounded flex items-center gap-1">
                            {resolution} • {aspectRatio}
                        </span>
                        {t.generateBtn}
                        {activeShotType && <span className="text-xs opacity-80">({t.presetLabels[PRESETS.find(p => p.shotType === activeShotType)?.labelKey as keyof typeof t.presetLabels]})</span>}
                        <ChevronRight size={20} />
                    </>
                )}
            </button>
            
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                    {error}
                </div>
            )}
          </section>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-6 flex flex-col h-full min-h-[500px]">
            <div className="flex items-center gap-2 mb-6">
                <h2 className="text-lg font-semibold">{t.generatedAngles}</h2>
                <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">{results.length}</span>
            </div>

            <div className="flex-1 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-6 overflow-y-auto max-h-[800px]">
                {results.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-60">
                        <div className="w-24 h-24 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                            <Rotate3d size={40} />
                        </div>
                        <p className="font-medium">{t.noViews}</p>
                        <p className="text-sm mt-1">{t.noViewsHint}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {results.map((result, idx) => (
                            <div key={result.timestamp} className="bg-black/40 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-all">
                                <div className="aspect-square relative bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                                    <img src={result.imageUrl} alt={`Angle ${result.azimuth}, ${result.elevation}`} className="w-full h-full object-contain" />
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs font-mono text-zinc-300 border border-white/10 flex flex-col gap-0.5">
                                       <span>Az: {result.azimuth}°</span>
                                       <span>El: {result.elevation}°</span>
                                       {Math.abs(result.roll) > 1 && <span>Rl: {result.roll}°</span>}
                                    </div>
                                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                        <div className="px-2 py-1 bg-emerald-500/20 backdrop-blur-sm rounded text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                                            {result.resolution}
                                        </div>
                                        <div className="px-2 py-1 bg-purple-500/20 backdrop-blur-sm rounded text-[10px] font-bold text-purple-300 border border-purple-500/30">
                                            {result.aspectRatio}
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                        <a 
                                            href={result.imageUrl} 
                                            download={`dino-ai-${result.azimuth}-${result.elevation}-${result.resolution}-${result.aspectRatio.replace(':','-')}.png`}
                                            className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                                            title={t.download}
                                        >
                                            <Download size={20} />
                                        </a>
                                    </div>
                                </div>
                                <div className="p-3 bg-zinc-900/50 text-xs text-zinc-400 border-t border-zinc-800">
                                    {getLabel(result)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;