"use client"

import { useState } from "react"
import { Header } from "@/components/layout/Header"
import { Card, CardHeader, CardTitle } from "@/components/card"
import { AlertTriangle } from "lucide-react"

type Diagnosis = {
  name: string;
  confidence: number;
}

export default function DiagnosisViewer() {
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'Findings' | 'Differential' | 'Plan'>('Findings')
  const [assessment, setAssessment] = useState('')

  const diagnoses: Diagnosis[] = [
    {
      name: "Primary Biliary Cholangitis",
      confidence: 92
    },
    {
      name: "Autoimmune Hepatitis",
      confidence: 78
    }
  ]

  return (
    <main className="bg-white flex flex-col min-h-screen">
      <Header />
      <div className="container mx-auto p-4 flex-1">
        {/* AI Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertTriangle className="text-yellow-500" size={20} />
          <p className="text-sm text-black">
            AI suggestions are meant to support, not replace, clinical judgment. Please review all findings carefully.
          </p>
        </div>

        <div className="grid grid-cols-7 gap-6">
          {/* Left Panel - Diagnostic Suggestions */}
          <div className="col-span-2">
            <Card className="bg-gray-50 sticky top-4">
              <CardHeader>
                <CardTitle className="text-[#80BCFF]">Diagnostic Suggestions</CardTitle>
              </CardHeader>
              <div className="p-4 space-y-4">
                {diagnoses.map((diagnosis) => (
                  <div 
                    key={diagnosis.name}
                    onClick={() => {
                      setSelectedDiagnoses(prev => 
                        prev.includes(diagnosis.name)
                          ? prev.filter(d => d !== diagnosis.name)
                          : [...prev, diagnosis.name]
                      )
                    }}
                    className={`p-4 rounded-lg cursor-pointer border-2 transition-colors ${
                      selectedDiagnoses.includes(diagnosis.name)
                        ? 'border-[#80BCFF] bg-white' 
                        : 'border-dashed border-gray-200 hover:border-[#80BCFF]'
                    }`}
                  >
                    <h3 className="font-medium mb-2 text-black">{diagnosis.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-black">AI Confidence</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${diagnosis.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm text-black">{diagnosis.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Panel - Detailed Information */}
          <div className="col-span-5">
            <div className="space-y-4">
              {selectedDiagnoses.map((diagnosisName) => (
                <Card key={diagnosisName}>
                  <CardHeader className="flex flex-row items-center justify-between border-b">
                    <CardTitle className="text-[#80BCFF]">{diagnosisName}</CardTitle>
                    <div className="text-sm text-black">Severity: Moderate</div>
                  </CardHeader>
                  
                  {/* Tabs */}
                  <div className="border-b">
                    <div className="flex">
                      {(['Findings', 'Differential', 'Plan'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-6 py-3 text-sm font-medium transition-colors
                            ${activeTab === tab 
                              ? 'text-[#80BCFF] border-b-2 border-[#80BCFF]' 
                              : 'text-black hover:text-[#80BCFF]'
                            }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">
                    <div className="text-black">
                      {activeTab === 'Findings' && (
                        <div className="space-y-2">
                          <h4 className="font-medium mb-2">Clinical Findings</h4>
                          <ul className="list-disc pl-5 space-y-2">
                            <li>Elevated liver enzymes</li>
                            <li>Chronic fatigue</li>
                            <li>Abdominal discomfort</li>
                          </ul>
                        </div>
                      )}
                      
                      {activeTab === 'Differential' && (
                        <div className="space-y-2">
                          <h4 className="font-medium mb-2">Differential Considerations</h4>
                          <ul className="list-disc pl-5 space-y-2">
                            <li>Consider autoimmune hepatitis due to overlap in presentations</li>
                            <li>Rule out drug-induced liver injury</li>
                          </ul>
                        </div>
                      )}

                      {activeTab === 'Plan' && (
                        <div className="space-y-2">
                          <h4 className="font-medium mb-2">Treatment Plan</h4>
                          <ul className="list-disc pl-5 space-y-2">
                            <li>Schedule follow-up in 2 weeks</li>
                            <li>Monitor liver function tests</li>
                            <li>Consider referral to specialist</li>
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Physician Assessment */}
                    <div className="mt-6">
                      <h4 className="font-medium mb-2 text-black">Physician Assessment</h4>
                      <textarea
                        value={assessment}
                        onChange={(e) => setAssessment(e.target.value)}
                        placeholder="Add your clinical assessment, concerns, or plan..."
                        className="w-full h-32 p-3 border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#80BCFF] text-black placeholder-gray-400"
                      />
                    </div>
                  </div>
                </Card>
              ))}

              {/* Action Buttons - Outside the diagnosis cards */}
              {selectedDiagnoses.length > 0 && (
                <div className="flex justify-end gap-4 mt-4">
                  <button className="px-6 py-2 rounded-lg bg-gray-200 text-black font-medium">
                    Request AI Review
                  </button>
                  <button className="px-6 py-2 rounded-lg bg-green-500 text-white font-medium">
                    Confirm Diagnosis
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}