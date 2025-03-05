"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/card";
import {  
  Pencil, 
  Circle, 
  Ruler, 
  Type, 
  Eraser, 
  Undo2, 
  Redo2, 
  Save,
  Palette
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { storeCurrentDiagnosis, getCurrentDiagnosis } from '@/services/diagnosisStorage';

interface Point {
  x: number;
  y: number;
}

interface PathData {
  tool: string;
  color: string;
  points: Point[];
}

// ScanViewerContent component that uses searchParams
function ScanViewerContent() {
  const searchParams = useSearchParams();
  const [selectedScan, setSelectedScan] = useState('CT');
  const [scanName, setScanName] = useState('');
  // Get the patient ID from the URL, fallback to P1001 if not found
  const patientId = searchParams.get('patientId') || 'P1001';
  const [imagePath, setImagePath] = useState(`/scans/${patientId}/CT.png`);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const router = useRouter();
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [measurements, setMeasurements] = useState<{ start: Point, end: Point }[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // Add color selection state
  const [selectedColor, setSelectedColor] = useState('#FF0000'); // Red default
  const colorOptions = [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
  ];
  // Add state to track if color picker is open
  const [showColorPicker, setShowColorPicker] = useState(false);
  // Add a simpler version of path tracking, just to maintain the interface
  const pathsRef = useRef<PathData[]>([]);
  
  const saveToHistory = () => {
    if (!canvasRef.current) return;
    
    const newState = canvasRef.current.toDataURL();
    
    // If we're not at the end of the history, truncate it
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Add the new state and update the index
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

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
  
      // Get existing patient data if available
      const existingData = getCurrentDiagnosis();
  
      // Call the diagnosis API
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageData,
          symptoms: symptoms,
          scanType: selectedScan,
          patientId: patientId, // Add patient ID to the request
          // Include any existing patient data
          vitals: existingData?.vitals || {},
          labResults: existingData?.labResults || [],
          medicalHistory: existingData?.medicalHistory || {}
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to generate diagnosis: ${response.statusText}`);
      }
  
      const diagnosisResult = await response.json();
  
      // Create a complete result object with all patient data
      const completeData = {
        ...diagnosisResult,
        imageData,
        timestamp: new Date().toISOString(),
        symptoms,
        patientId, // Store patientId in the result
        // Preserve existing patient data
        vitals: existingData?.vitals || {},
        labResults: existingData?.labResults || [],
        medicalHistory: existingData?.medicalHistory || {}
      };
  
      // Store the complete diagnosis result using the storage service
      storeCurrentDiagnosis(completeData);
      
      // Legacy support - will be used as fallback in DiagnosisViewer
      localStorage.setItem('diagnosisResult', JSON.stringify(completeData));
  
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
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        // Initialize history with empty canvas
        if (history.length === 0) {
          saveToHistory();
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageLoaded, history.length, selectedColor]);

  // Update stroke color when color changes
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = selectedColor;
        ctx.fillStyle = selectedColor;
      }
    }
  }, [selectedColor]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      loadCanvasState(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      loadCanvasState(historyIndex + 1);
    }
  };

  const loadCanvasState = (index: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      if (index >= 0 && index < history.length) {
        const img = new Image();
        img.src = history[index];
        img.onload = () => {
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
      ctx.fillStyle = selectedColor;
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
      ctx.strokeStyle = selectedColor;
      ctx.fillStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      
      // For all tools except text and measure, start a path
      if (selectedTool !== 'text' && selectedTool !== 'measure') {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
      
      // For the draw tool, create a new drawing path
      if (selectedTool === 'draw') {
        // Store the current point as the starting point of this path
        pathsRef.current.push({
          tool: 'draw',
          color: selectedColor,
          points: [{x, y}]
        });
      }
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
        // Let's fix the drawing problem by NOT creating a new path here
        // Just continue the current path
        ctx.lineTo(x, y);
        ctx.stroke();
        
        // Add this point to the current path data
        if (pathsRef.current.length > 0) {
          const currentPath = pathsRef.current[pathsRef.current.length - 1];
          currentPath.points.push({x, y});
        }
        break;
        
      case 'circle':
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        loadCanvasState(historyIndex);
        
        const radius = Math.sqrt(
          Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2)
        );
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
          loadCanvasState(historyIndex);
          
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(x, y);
          ctx.stroke();
          
          const distance = Math.sqrt(
            Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2)
          );
          ctx.font = '14px Arial';
          ctx.fillStyle = selectedColor;
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
    if (!isDrawing || !canvasRef.current) return;
    
    if (selectedTool === 'draw') {
      // Don't do anything special for drawing, just save to history
    } else if (selectedTool === 'circle' || selectedTool === 'measure') {
      // For tools that clear and redraw, we need to finalize them
    }
    
    setIsDrawing(false);
    saveToHistory();
  };
  
  // We'll keep a simpler approach for now, removing the redrawPaths function
  // If needed later, we can add it back

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

                {/* Color Picker Button */}
                <div className="relative">
                  <button 
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-full bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Palette size={18} />
                      Color
                    </div>
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-300" 
                      style={{ backgroundColor: selectedColor }}
                    />
                  </button>
                  
                  {/* Color Picker Dropdown */}
                  {showColorPicker && (
                    <div className="absolute z-10 mt-1 p-2 bg-white rounded-md shadow-lg border border-gray-200 w-full">
                      <div className="grid grid-cols-4 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => {
                              setSelectedColor(color);
                              setShowColorPicker(false);
                            }}
                            className="w-8 h-8 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#80BCFF]"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-full h-8 mt-2 cursor-pointer"
                      />
                    </div>
                  )}
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
                    disabled={historyIndex <= 0}
                    className={`flex-1 bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center ${
                      historyIndex <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Undo2 size={18} />
                  </button>
                  <button 
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className={`flex-1 bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center ${
                      historyIndex >= history.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
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
                    Loading {selectedScan} scan for Patient {patientId}...
                  </div>
                )}
                <img 
                  ref={imageRef}
                  src={imagePath}
                  alt={`${selectedScan} Scan for Patient ${patientId}`}
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

// Main component with Suspense boundary
export default function ScanViewer() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#80BCFF] mb-4"></div>
      <p className="text-gray-600">Loading scan viewer...</p>
    </div>}>
      <ScanViewerContent />
    </Suspense>
  );
}