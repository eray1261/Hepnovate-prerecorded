"use client"

import { useState } from "react"
import { Header } from "@/components/layout/Header"
import { Card, CardHeader, CardTitle } from "@/components/card"
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
} from "lucide-react"
import { useRouter } from "next/navigation"

export default function ScanViewer() {
  const [selectedScan, setSelectedScan] = useState('CT')
  const [scanName, setScanName] = useState('')
  const router = useRouter()

  return (
    <main className="h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto p-4 overflow-hidden">
        <div className="h-full grid grid-cols-7 gap-4">
          
          {/* Left Column - Scan Info and Tools */}
          <div className="col-span-2 space-y-4 overflow-y-auto">
            {/* Scan Name Section */}
            <Card className="p-4 border border-dashed border-gray-200">
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
            <Card className="p-4 border border-dashed border-gray-200">
              <CardHeader className="py-2">
                <CardTitle className="text-[#80BCFF]">Select Scan</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                <div className="relative">
                  <select 
                    value={selectedScan}
                    onChange={(e) => {
                      setSelectedScan(e.target.value);
                      setScanName(''); // Reset scan name when scan type changes
                    }}
                    className="w-full p-2 border rounded-md bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#80BCFF]"
                  >
                    <option value="image">Image</option>
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
                <button className="w-full bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center gap-2">
                  <Move size={18} />
                  Pan View
                </button>

                <button className="w-full bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center gap-2">
                  <Pencil size={18} />
                  Draw
                </button>

                <button className="w-full bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center gap-2">
                  <Circle size={18} />
                  Circle Region
                </button>

                <button className="w-full bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center gap-2">
                  <Ruler size={18} />
                  Measure
                </button>

                <button className="w-full bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center gap-2">
                  <Type size={18} />
                  Add Text
                </button>

                <button className="w-full bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center gap-2">
                  <Eraser size={18} />
                  Erase
                </button>

                <div className="flex gap-2">
                  <button className="flex-1 bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center">
                    <Undo2 size={18} />
                  </button>
                  <button className="flex-1 bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center">
                    <Redo2 size={18} />
                  </button>
                </div>

                <button className="w-full bg-[#80BCFF] text-black font-bold p-2 rounded-md flex items-center justify-center gap-2">
                  <Save size={18} />
                  Save edits
                </button>
              </div>
            </Card>
          </div>

          {/* Right Column - Scan Viewer */}
          <div className="col-span-5 flex flex-col">
            <Card className="flex-1 border border-gray-200">
              <div className="relative h-full bg-black rounded-lg overflow-hidden">
                <img 
                  src="/api/placeholder/1200/800"
                  alt="CT Scan"
                  className="w-full h-full object-contain"
                />
              </div>
            </Card>
            
            {/* Generate Diagnosis Button */}
            <div className="flex justify-end mt-2">
            <button 
              onClick={() => router.push('/diagnosis')}
              className="bg-[#80BCFF] text-white px-8 py-2 rounded-lg flex items-center gap-1"
            >
              Generate Diagnosis <span className="text-lg">→</span>
            </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}