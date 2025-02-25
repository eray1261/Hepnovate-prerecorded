"use client";

import { useEffect, useState } from 'react';
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/card";
import { AlertTriangle, ThumbsDown, RefreshCw, X } from "lucide-react";
import { useRouter } from 'next/navigation';
import { storeCurrentDiagnosis, getCurrentDiagnosis } from '@/services/diagnosisStorage';

type Diagnosis = {
  name: string;
  confidence: number;
  findings: string[];
  differential: string[];
  plan: string[];
  severity: 'Mild' | 'Moderate' | 'Severe';
}

// Enhanced DiagnosisResult type with additional properties
type DiagnosisResult = {
  diagnoses: Diagnosis[];
  imageData?: string;     // Base64 image data
  symptoms?: string[];    // Patient symptoms
}

export default function DiagnosisViewer() {
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'Findings' | 'Differential' | 'Plan'>('Findings');
  const [assessment, setAssessment] = useState('');
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isRequestingNew, setIsRequestingNew] = useState(false);
  const [imageData, setImageData] = useState<string>('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Get the diagnosis result from localStorage
    const loadDiagnosis = () => {
      // Try using the storage service first
      let storedDiagnosis = getCurrentDiagnosis();
      
      // Fall back to direct localStorage access
      if (!storedDiagnosis) {
        const localData = localStorage.getItem('diagnosisResult');
        if (localData) {
          try {
            storedDiagnosis = JSON.parse(localData);
          } catch (e) {
            console.error('Error parsing diagnosis data:', e);
          }
        }
      }
      
      if (!storedDiagnosis) {
        alert('No diagnosis data found');
        router.push('/scan');
        return;
      }

      try {
        setDiagnoses(storedDiagnosis.diagnoses || []);
        
        // If there's a first diagnosis, select it by default
        if (storedDiagnosis.diagnoses && storedDiagnosis.diagnoses.length > 0) {
          setSelectedDiagnoses([storedDiagnosis.diagnoses[0].name]);
        }
        
        // Store image data and symptoms if available
        if (storedDiagnosis.imageData) {
          setImageData(storedDiagnosis.imageData);
        }
        
        if (storedDiagnosis.symptoms) {
          setSymptoms(storedDiagnosis.symptoms);
        }
        
        // Save in our structured storage for future use
        if (!getCurrentDiagnosis()) {
          storeCurrentDiagnosis(storedDiagnosis as DiagnosisResult);
          // Clear old format
          localStorage.removeItem('diagnosisResult');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading diagnosis data:', error);
        alert('Error loading diagnosis data');
        router.push('/scan');
      }
    };

    loadDiagnosis();
  }, [router]);

  // Handle requesting a new diagnosis with feedback
  const handleRequestNewDiagnosis = async () => {
    if (!feedbackText.trim()) {
      alert('Please provide feedback before requesting a new diagnosis');
      return;
    }
    
    if (!imageData) {
      alert('Image data not available for re-diagnosis');
      return;
    }
    
    setIsRequestingNew(true);
    
    try {
      // Find the selected diagnosis to include in request
      const selectedDiagnosis = diagnoses.find(d => 
        selectedDiagnoses.includes(d.name)
      );
      
      // Make API request with feedback
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageData,
          symptoms: symptoms,
          feedback: feedbackText,
          previousDiagnosis: selectedDiagnosis
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get new diagnosis');
      }
      
      const newDiagnosisData: DiagnosisResult = await response.json();
      
      // Store the new diagnosis result with image and symptom data
      const completeData: DiagnosisResult = {
        ...newDiagnosisData,
        imageData,
        symptoms
      };
      
      // Save for future use
      storeCurrentDiagnosis(completeData);
      
      // Refresh the page to show new diagnosis
      window.location.reload();
    } catch (error) {
      console.error('Error requesting new diagnosis:', error);
      alert('Failed to get new diagnosis. Please try again.');
    } finally {
      setIsRequestingNew(false);
      setShowFeedback(false);
    }
  };

  // Feedback card component
  const FeedbackCard = () => (
    <Card className="border-2 border-red-500 mt-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-[#80BCFF]">Diagnosis Feedback</CardTitle>
          <button 
            onClick={() => setShowFeedback(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Please provide your feedback about what's missing or incorrect in this diagnosis:
          </p>
          
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="This diagnosis needs improvement because..."
            className="w-full h-28 p-3 border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#80BCFF] text-black placeholder-gray-400"
          />
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowFeedback(false)}
            className="px-4 py-2 rounded-lg bg-gray-200 text-black font-medium"
          >
            Cancel
          </button>
          
          <button
            onClick={handleRequestNewDiagnosis}
            disabled={isRequestingNew || !feedbackText.trim()}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium flex items-center gap-1 disabled:opacity-50"
          >
            {isRequestingNew ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Request New Diagnosis
              </>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );

  // Loading state
  if (isLoading) {
    return (
      <main className="bg-white flex flex-col min-h-screen">
        <Header />
        <div className="container mx-auto p-4 flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#80BCFF] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading diagnosis data...</p>
          </div>
        </div>
      </main>
    );
  }

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
              {selectedDiagnoses.map((diagnosisName) => {
                const diagnosis = diagnoses.find(d => d.name === diagnosisName);
                if (!diagnosis) return null;

                return (
                  <Card key={diagnosisName}>
                    <CardHeader className="flex flex-row items-center justify-between border-b">
                      <CardTitle className="text-[#80BCFF]">{diagnosisName}</CardTitle>
                      <div className="text-sm text-black">Severity: {diagnosis.severity}</div>
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
                              {diagnosis.findings.map((finding, index) => (
                                <li key={index}>{finding}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {activeTab === 'Differential' && (
                          <div className="space-y-2">
                            <h4 className="font-medium mb-2">Differential Considerations</h4>
                            <ul className="list-disc pl-5 space-y-2">
                              {diagnosis.differential.map((diff, index) => (
                                <li key={index}>{diff}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {activeTab === 'Plan' && (
                          <div className="space-y-2">
                            <h4 className="font-medium mb-2">Treatment Plan</h4>
                            <ul className="list-disc pl-5 space-y-2">
                              {diagnosis.plan.map((item, index) => (
                                <li key={index}>{item}</li>
                              ))}
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
                );
              })}

              {/* Feedback Card (conditional) */}
              {showFeedback && <FeedbackCard />}

              {/* Action Buttons */}
              {selectedDiagnoses.length > 0 && (
                <div className="flex justify-end gap-4 mt-4">
                  <button 
                    onClick={() => setShowFeedback(true)}
                    className="px-6 py-2 rounded-lg bg-gray-200 text-black font-medium flex items-center gap-2"
                  >
                    <ThumbsDown size={16} />
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
  );
}