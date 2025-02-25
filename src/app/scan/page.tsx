"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { 
  Move, 
  Pencil, 
  Circle, 
  Ruler, 
  Type, 
  Eraser, 
  Undo2, 
  Redo2, 
  Save 
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface Point {
  x: number;
  y: number;
}

export default function ScanViewer() {
  const [selectedScan, setSelectedScan] = useState('CT');
  const [scanName, setScanName] = useState('');
  const [imagePath, setImagePath] = useState('/scans/P1001/CT.png');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const router = useRouter();
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [measurements, setMeasurements] = useState<{ start: Point, end: Point }[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const patientId = 'P1001';
  const [isGenerating, setIsGenerating] = useState(false);
  const searchParams = useSearchParams();
  const handleGenerateDiagnosis = async () => {
    if (!canvasRef.current) return;
    setIsGenerating(true);

    try {
      // Create a temporary canvas to combine the image and annotations
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx || !imageRef.current) return;

      // Reduce the image size
      const MAX_WIDTH = 1024; // Adjust as needed
      const MAX_HEIGHT = 1024;
      let width = canvasRef.current.width;
      let height = canvasRef.current.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
          if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
          }
      } else {
          if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
          }
      }

      tempCanvas.width = width;
      tempCanvas.height = height;

      // Draw with reduced dimensions
      tempCtx.drawImage(imageRef.current, 0, 0, width, height);
      tempCtx.drawImage(canvasRef.current, 0, 0, width, height);

      // Compress the image more by reducing quality
      const imageData = tempCanvas.toDataURL('image/jpeg', 0.7).split(',')[1];

      // Get and parse symptoms with better error handling
      const rawSymptoms = searchParams.get('symptoms');
      let symptoms: string[] = [];
      
      if (!rawSymptoms) {
        alert('No symptoms data found. Please return to the previous page and ensure symptoms are recorded.');
        return;
      }

      try {
        symptoms = decodeURIComponent(rawSymptoms)
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
      } catch (e) {
        console.error('Error parsing symptoms:', e);
        alert('Error processing symptoms data. Please try again.');
        return;
      }

      if (symptoms.length === 0) {
        alert('No valid symptoms found. Please ensure symptoms are recorded before generating diagnosis.');
        return;
      }

      // Call the diagnosis API
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageData,
          symptoms: symptoms,
          scanType: selectedScan // Add scan type if needed
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate diagnosis: ${response.statusText}`);
      }

      const diagnosisResult = await response.json();

      // Store the diagnosis result with timestamp
      localStorage.setItem('diagnosisResult', JSON.stringify({
        ...diagnosisResult,
        timestamp: new Date().toISOString(),
        symptoms: symptoms
      }));

      // Navigate to the diagnosis viewer
      router.push('/diagnosis');

    } catch (error) {
      console.error('Error generating diagnosis:', error);
      alert('Failed to generate diagnosis. Please check the console for details and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (selectedScan) {
      setImagePath(`/scans/${patientId}/${selectedScan}.png`);
      setImageLoaded(false);
    }
  }, [selectedScan, patientId]);

  // Initialize canvas when image loads
  useEffect(() => {
    if (imageLoaded && canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = imageRef.current.width;
        canvas.height = imageRef.current.height;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, [imageLoaded]);

  const saveToHistory = () => {
    if (!canvasRef.current) return;
    const newState = canvasRef.current.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newState]);
    setHistoryIndex(newHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        const img = new Image();
        img.src = history[historyIndex - 1];
        img.onload = () => {
          ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        const img = new Image();
        img.src = history[historyIndex + 1];
        img.onload = () => {
          ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textPosition || !textInput.trim() || !canvasRef.current) return;
  
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.font = '16px Arial';
      ctx.fillStyle = 'red';
      ctx.fillText(textInput, textPosition.x, textPosition.y);
      saveToHistory();
    }
  
    setTextInput('');
    setShowTextInput(false);
    setTextPosition(null);
  };
  
  const handleSave = async () => {
    if (!canvasRef.current) return;
  
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
  
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
  
    if (imageRef.current) {
      tempCtx.drawImage(imageRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
    }
    tempCtx.drawImage(canvasRef.current, 0, 0);
  
    const imageData = tempCanvas.toDataURL('image/png');
  
    try {
      const response = await fetch('/api/saveImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          filePath: `/Users/eshanikaray/hepnovate/public/scans/${patientId}/${selectedScan}_annotated.png`,
        }),
      });
  
      const result = await response.json();
      if (response.ok) {
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Error saving image.');
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedTool || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPoint({ x, y });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    if (selectedTool === 'text') {
  setTextPosition({ x, y });
  setShowTextInput(true);
  return;
}

if (selectedTool === 'measure') {
  setIsMeasuring(true);
  setMeasurements([...measurements, { start: { x, y }, end: { x, y }}]);
  return;
}

  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !selectedTool || !canvasRef.current || !startPoint) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    switch (selectedTool) {
      case 'draw':
        ctx.lineTo(x, y);
        ctx.stroke();
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2)
        );
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (historyIndex >= 0) {
          const img = new Image();
          img.src = history[historyIndex];
          ctx.drawImage(img, 0, 0);
        }
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'eraser':
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        break;

        case 'measure':
          if (isMeasuring && startPoint) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (historyIndex >= 0) {
              const img = new Image();
              img.src = history[historyIndex];
              ctx.drawImage(img, 0, 0);
            }
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            const distance = Math.sqrt(
              Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2)
            );
            ctx.font = '14px Arial';
            ctx.fillStyle = 'red';
            ctx.fillText(
              `${distance.toFixed(1)}px`,
              (startPoint.x + x) / 2,
              (startPoint.y + y) / 2 - 10
            );
          }
          break;
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const handleToolSelect = (tool: string) => {
    setSelectedTool(tool);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto p-4">
        <div className="min-h-[calc(100vh-theme(spacing.20))] grid grid-cols-7 gap-4">
          
          {/* Left Column - Scan Info and Tools */}
          <div className="col-span-2 space-y-4">
            {/* Scan Name Section */}
            <Card className="p-4 border border-dashed border-gray-200 sticky top-4">
              <CardHeader className="py-2">
                <CardTitle className="text-[#80BCFF]">{selectedScan} Scan</CardTitle>
              </CardHeader>
              <input 
                type="text"
                value={scanName}
                onChange={(e) => setScanName(e.target.value)}
                placeholder={`${selectedScan} Report info..`}
                className="w-full p-2 border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-[#80BCFF]"
              />
            </Card>

            {/* Tools Section */}
            <Card className="p-4 border border-dashed border-gray-200 sticky top-48">
              <CardHeader className="py-2">
                <CardTitle className="text-[#80BCFF]">Select Scan</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                <div className="relative">
                  <select 
                    value={selectedScan}
                    onChange={(e) => {
                      setSelectedScan(e.target.value);
                      setScanName('');
                    }}
                    className="w-full p-2 border rounded-md bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#80BCFF]"
                  >
                    <option value="CT">CT</option>
                    <option value="MRI">MRI</option>
                    <option value="Ultrasound">Ultrasound</option>
                    <option value="Fibroscan">Fibroscan</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Tool Buttons */}

                <button 
                  onClick={() => handleToolSelect('draw')}
                  className={`w-full ${selectedTool === 'draw' ? 'bg-blue-600' : 'bg-[#80BCFF]'} text-black font-bold p-2 rounded-md flex items-center justify-center gap-2`}
                >
                  <Pencil size={18} />
                  Draw
                </button>

                <button 
                  onClick={() => handleToolSelect('circle')}
                  className={`w-full ${selectedTool === 'circle' ? 'bg-blue-600' : 'bg-[#80BCFF]'} text-black font-bold p-2 rounded-md flex items-center justify-center gap-2`}
                >
                  <Circle size={18} />
                  Circle Region
                </button>

                <button 
                  onClick={() => handleToolSelect('measure')}
                  className={`w-full ${selectedTool === 'measure' ? 'bg-blue-600' : 'bg-[#80BCFF]'} text-black font-bold p-2 rounded-md flex items-center justify-center gap-2`}
                >
                  <Ruler size={18} />
                  Measure
                </button>

                <button 
                  onClick={() => handleToolSelect('text')}
                  className={`w-full ${selectedTool === 'text' ? 'bg-blue-600' : 'bg-[#80BCFF]'} text-black font-bold p-2 rounded-md flex items-center justify-center gap-2`}
                >
                  <Type size={18} />
                  Add Text
                </button>

                <button 
                  onClick={() => handleToolSelect('eraser')}
                  className={`w-full ${selectedTool === 'eraser' ? 'bg-blue-600' : 'bg-[#80BCFF]'} text-black font-bold p-2 rounded-md flex items-center justify-center gap-2`}
                >
                  <Eraser size={18} />
                  Erase
                </button>

                <div className="flex gap-2">
                  <button 
                    onClick={handleUndo}
                    className="flex-1 bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center"
                  >
                    <Undo2 size={18} />
                  </button>
                  <button 
                    onClick={handleRedo}
                    className="flex-1 bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center"
                  >
                    <Redo2 size={18} />
                  </button>
                </div>

                <button 
                  onClick={handleSave} 
                  className="w-full bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save edits
                </button>
              </div>
            </Card>
          </div>

          {/* Right Column - Scan Viewer */}
          <div className="col-span-5 flex flex-col">
            <Card className="flex-1 border border-gray-200">
              <div className="relative min-h-[600px] bg-black rounded-lg overflow-hidden">
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    Loading {selectedScan} scan...
                  </div>
                )}
                <img 
                  ref={imageRef}
                  src={imagePath}
                  alt={`${selectedScan} Scan`}
                  className={`w-full h-full object-contain transition-opacity duration-200 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onError={() => setImageLoaded(false)}
                  onLoad={() => setImageLoaded(true)}
                />

                {/* Text Input Overlay */}
                {showTextInput && textPosition && (
                  <div 
                    className="absolute z-10 bg-white p-2 rounded shadow-lg"
                    style={{ left: textPosition.x + 'px', top: textPosition.y + 'px' }}
                  >
                    <form onSubmit={handleTextSubmit}>
                      <input
                        ref={textInputRef}
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        className="border rounded px-2 py-1 text-sm w-48"
                        placeholder="Enter text..."
                        autoFocus
                      />
                    </form>
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ cursor: selectedTool ? 'crosshair' : 'default' }}
                />
              </div>
            </Card>
            
            {/* Generate Diagnosis Button */}
            <div className="flex justify-end mt-2">
              <button 
                onClick={handleGenerateDiagnosis}
                disabled={isGenerating}
                className={`
                  bg-[#80BCFF] text-white px-8 py-2 rounded-lg flex items-center gap-1
                  ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isGenerating ? (
                  <>Generating Diagnosis...</>
                ) : (
                  <>Generate Diagnosis <span className="text-lg">→</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}