"use client"

import { useState, useEffect, useRef } from "react"
import { Header } from "@/components/layout/Header"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/card"
import { useRouter } from "next/navigation"
import { parse } from "csv-parse"
import { 
  getCurrentDiagnosis, 
  storeCurrentDiagnosis,
  DiagnosisResult
} from "@/services/diagnosisStorage";

type Symptom = {
  name: string;
  detected: boolean;
}

type Vitals = {
  temperature?: string;
  bloodPressure?: string;
  pulse?: string;
}

type LabResult = {
  name: string;
  value: string;
  flag?: string;
  unit: string;
}

type MedicalHistory = {
  activeConditions: Array<{
    condition: string;
    date: string;
  }>;
  currentMedication: Array<{
    name: string;
    dosage: string;
  }>;
  pastSurgeries: Array<{
    surgery: string;
    date: string;
  }>;
  allergies: Array<{
    allergen: string;
    reaction: string;
  }>;
  socialHistory: string;
  familyHistory: string;
  immunizations: Array<{
    immunization: string;
    date: string;
  }>;
}

type PatientRecord = {
  'Patient ID': string;
  [key: string]: string; // Allows for other lab result fields
};

// P1000 transcription data
const p1000TranscriptionData = [
  {
    timestamp: 4000,
    text: "You have a temperature of 102F and blood pressure of 90 over 120. How are you feeling?"
  },
  {
    timestamp: 7000,
    text: "I’m feeling unwell."
  },
  {
    timestamp:9000,
    text: "What are your symptoms?"
  },
  {
    timestamp: 12000,
    text: "I have pale skin and abdominal pain."
  },
  {
    timestamp: 1400,
    text: "Thanks. We’ll run some tests."
  }
];


// Keep your existing P1001 transcription data
const p1001TranscriptionData = [
  {
    timestamp: 2500,
    text: "The patient has a fever of 102F"
  },
  {
    timestamp: 4500,
    text: " and a blood pressure of 90 over 120"
  },
  {
    timestamp: 6500,
    text: " and her heart beats at 72."
  },
  {
    timestamp: 8500,
    text: " She has pale skin"
  },
  {
    timestamp: 10500,
    text: " and shows signs of jaundice."
  },
  {
    timestamp: 12500,
    text: " She has abdominal pain for the past 3 days"
  }
];


const mockTranscriptionData = [
  {
    patientId: "P1000",
    transcription: p1000TranscriptionData
  },
  {
    patientId: "P1001",
    transcription: p1001TranscriptionData
  },
  {
    patientId: "P1002",
    transcription: p1000TranscriptionData
  },
  {
    patientId: "P1003",
    transcription: p1001TranscriptionData
  },
  {
    patientId: "P1004",
    transcription: p1000TranscriptionData
  },
  {
    patientId: "P1005",
    transcription: p1001TranscriptionData
  },
  {
    patientId: "P1006",
    transcription: p1000TranscriptionData
  },
  {
    patientId: "P1007",
    transcription: p1001TranscriptionData
  },
  {
    patientId: "P1008",
    transcription: p1000TranscriptionData
  },
  {
    patientId: "P1009",
    transcription: p1001TranscriptionData
  }
];

export default function Home() {
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [vitals, setVitals] = useState<Vitals>({})
  const [transcription, setTranscription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const router = useRouter()
  const [selectedPatientId, setSelectedPatientId] = useState('P1000')
  const [patientIds, setPatientIds] = useState<string[]>([
    'P1000', 'P1001', 'P1002', 'P1003', 'P1004', 
    'P1005', 'P1006', 'P1007', 'P1008', 'P1009'
  ])
  const [labResults, setLabResults] = useState<LabResult[]>([])
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory>({
    activeConditions: [],
    currentMedication: [],
    pastSurgeries: [],
    allergies: [],
    socialHistory: "",
    familyHistory: "",
    immunizations: []
  })
  const [labTestDate, setLabTestDate] = useState<string>("")
  const [isPlaying, setIsPlaying] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const transcriptionIndexRef = useRef<number>(0)

  const labUnitMapping: { [key: string]: string } = {
    "ALT": "U/L",
    "AST": "U/L",
    "ALP": "U/L",
    "Albumin": "g/dL",
    "Total Protein": "g/dL",
    "Bilirubin": "mg/dL",
    "GGT": "U/L",
    "LD": "U/L",
    "PT": "sec",
    "INR": "",
    "Platelets": "K/μL",
    "WBC": "K/μL",
    "Hemoglobin": "g/dL",
    "Hematocrit": "%",
    "Creatinine": "mg/dL",
    "BUN": "mg/dL",
    "Sodium": "mEq/L",
    "Potassium": "mEq/L",
    "Chloride": "mEq/L",
    "Bicarbonate": "mEq/L",
    "Glucose": "mg/dL"
  }

  // Load saved data from localStorage on initial render
  useEffect(() => {
    const savedDiagnosis = getCurrentDiagnosis();
    if (savedDiagnosis) {
      if (savedDiagnosis.symptoms && savedDiagnosis.symptoms.length > 0) {
        const formattedSymptoms = savedDiagnosis.symptoms.map(name => ({
          name,
          detected: true
        }));
        setSymptoms(formattedSymptoms);
      }
      
      if (savedDiagnosis.vitals) {
        setVitals(savedDiagnosis.vitals);
      }
    }
  }, []);

  // Save symptoms and vitals to localStorage whenever they change
  useEffect(() => {
    if (symptoms.length > 0 || Object.keys(vitals).length > 0) {
      const currentData: DiagnosisResult = {
        diagnoses: [],
        symptoms: symptoms.map(s => s.name),
        vitals: vitals
      };
      storeCurrentDiagnosis(currentData);
    }
  }, [symptoms, vitals]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', stopPlayback);
      }
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
      }
    };
  }, []);

  // Update audio file when patient ID changes
// Update audio file when patient ID changes
useEffect(() => {
  if (isPlaying) {
    stopPlayback();
  }
  
  // Determine which audio file to use
  // Even patient IDs (P1000, P1002, etc.) use P1000.mp3 
  // Odd patient IDs (P1001, P1003, etc.) use P1001.m4a
  const isEvenPatientId = parseInt(selectedPatientId.replace('P', '')) % 2 === 0;
  const audioFile = isEvenPatientId ? 'P1000.mp3' : 'P1001.m4a';
  
  if (audioRef.current) {
    audioRef.current.src = `/audio/${audioFile}`;
    audioRef.current.addEventListener('ended', stopPlayback);
  } else {
    audioRef.current = new Audio(`/audio/${audioFile}`);
    audioRef.current.addEventListener('ended', stopPlayback);
  }
}, [selectedPatientId]);

  // Load CSV data for lab results and medical history
  useEffect(() => {
    const loadCSVData = async () => {
      try {
        // Load Lab Results
        const labResultsResponse = await fetch('/data/lab_results.csv');
        if (!labResultsResponse.ok) {
          console.error("Failed to load lab results:", labResultsResponse.status);
          return;
        }
        const labResultsCSV = await labResultsResponse.text();

        parse(labResultsCSV, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }, (err, records: Array<{ [key: string]: string }>) => {
          if (err) {
            console.error("Lab Results parsing error:", err);
            return;
          }

          const selectedPatientData = records.find(patient => patient['Patient ID'] === selectedPatientId);

          if (selectedPatientData) {
            if (selectedPatientData['Test Date']) {
              setLabTestDate(selectedPatientData['Test Date']);
            }

            const patientLabResults: LabResult[] = [];
            const allColumns = Object.keys(selectedPatientData);

            for (const column of allColumns) {
              if (column === 'Patient ID' || column === 'Test Date' || column.endsWith(' Flag')) {
                continue;
              }

              const value = selectedPatientData[column];
              const flagColumn = `${column} Flag`;
              const flag = selectedPatientData[flagColumn] || "";
              const unit = labUnitMapping[column] || "";

              patientLabResults.push({
                name: column,
                value: String(value || "").trim(),
                flag: String(flag || "").trim(),
                unit: unit
              });
            }

            setLabResults(patientLabResults);
          } else {
            console.log("Patient data not found for ID:", selectedPatientId);
            setLabResults([]);
          }
        });

        // Load Medical History
        const medicalHistoryResponse = await fetch('/data/medical_history.csv');
        if (!medicalHistoryResponse.ok) {
          console.error("Failed to load medical history:", medicalHistoryResponse.status);
          return;
        }
        const medicalHistoryCSV = await medicalHistoryResponse.text();

        parse(medicalHistoryCSV, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }, (err, records: Array<{ 
          'Patient ID': string;
          'Active Conditions': string;
          'Current Medications': string;
          'Past Surgeries': string;
          'Surgery Dates': string;
          'Allergies': string;
          'Reactions': string;
          'Social History': string;
          'Family History': string;
          'Immunizations': string;
          'Immunization Dates': string;
        }>) => {
          if (err) {
            console.error("Medical History parsing error:", err);
            return;
          }

          const selectedPatientData = records.find(record => record['Patient ID'] === selectedPatientId);

          if (selectedPatientData) {
            const conditionsStr = selectedPatientData['Active Conditions']
              .replace(/^\[|\]$/g, '')
              .replace(/['"]/g, '');
            
            const conditions = conditionsStr.split('), (').map(condition => {
              const [name, date] = condition
                .replace(/^\(|\)$/g, '')
                .split(', ');
              return {
                condition: name,
                date: date
              };
            });

            const medicationsStr = selectedPatientData['Current Medications']
              .replace(/^\[|\]$/g, '')
              .replace(/['"]/g, '');
            
            const medications = medicationsStr.split('), (').map(medication => {
              const [name, dosage] = medication
                .replace(/^\(|\)$/g, '')
                .split(', ');
              return {
                name: name,
                dosage: dosage
              };
            });

            const surgeriesStr = selectedPatientData['Past Surgeries']
              .replace(/^\[|\]$/g, '')
              .replace(/['"]/g, '');
            
            const surgeryDatesStr = selectedPatientData['Surgery Dates']
              .replace(/^\[|\]$/g, '')
              .replace(/['"]/g, '');
            
            const surgeries = surgeriesStr.split(', ').map((surgery, index) => {
              const dates = surgeryDatesStr.split(', ');
              return {
                surgery: surgery,
                date: dates[index] || ''
              };
            });

            const allergiesStr = selectedPatientData['Allergies']
              .replace(/^\[|\]$/g, '')
              .replace(/['"]/g, '');
            
            const reactionsStr = selectedPatientData['Reactions']
              .replace(/^\[|\]$/g, '')
              .replace(/['"]/g, '');
            
            const allergies = allergiesStr.split(', ').map((allergen, index) => {
              const reactions = reactionsStr.split(', ');
              return {
                allergen: allergen,
                reaction: reactions[index] || ''
              };
            });

            const immunizationsStr = selectedPatientData['Immunizations']
              .replace(/^\[|\]$/g, '')
              .replace(/['"]/g, '');
            
            const immunizationDatesStr = selectedPatientData['Immunization Dates']
              .replace(/^\[|\]$/g, '')
              .replace(/['"]/g, '');
            
            const immunizations = immunizationsStr.split(', ').map((immunization, index) => {
              const dates = immunizationDatesStr.split(', ');
              return {
                immunization: immunization,
                date: dates[index] || ''
              };
            });

            setMedicalHistory({
              activeConditions: conditions,
              currentMedication: medications,
              pastSurgeries: surgeries,
              allergies: allergies,
              socialHistory: selectedPatientData['Social History'] || '',
              familyHistory: selectedPatientData['Family History'] || '',
              immunizations: immunizations
            });
          } else {
            console.log("Patient data not found for ID:", selectedPatientId);
            setMedicalHistory({
              activeConditions: [],
              currentMedication: [],
              pastSurgeries: [],
              allergies: [],
              socialHistory: "",
              familyHistory: "",
              immunizations: []
            });
          }
        });

      } catch (error) {
        console.error("Error loading CSVs:", error);
      }
    };

    loadCSVData();
  }, [selectedPatientId, labUnitMapping]);

  const startPlayback = () => {
    if (!audioRef.current) return;
    
    try {
      // Reset transcription
      setTranscription("");
      transcriptionIndexRef.current = 0;
      // Also reset symptoms and vitals when starting new playback
      setSymptoms([]);
      setVitals({});
      
      const patientData = mockTranscriptionData.find(
        patient => patient.patientId === selectedPatientId
      );
      
      if (!patientData) {
        setError(`No transcription data found for patient ${selectedPatientId}`);
        return;
      }
      
      // Store the complete transcription to process at the end
      let fullTranscription = "";
      
      // Play audio
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.error("Error playing audio:", err);
        setError(`Failed to play audio for ${selectedPatientId}. Please check if the audio file exists.`);
      });
      
      setIsPlaying(true);
      setError(null);
      
      transcriptionIntervalRef.current = setInterval(() => {
        const currentTime = audioRef.current?.currentTime || 0;
        const timeInMs = currentTime * 1000;
        
        while (
          transcriptionIndexRef.current < patientData.transcription.length && 
          patientData.transcription[transcriptionIndexRef.current].timestamp <= timeInMs
        ) {
          const chunk = patientData.transcription[transcriptionIndexRef.current];
          setTranscription(prev => prev + chunk.text);
          // Add to full transcription but DON'T detect symptoms yet
          fullTranscription += chunk.text;
          transcriptionIndexRef.current++;
          
          // If this is the last piece of transcription, process all symptoms
          if (transcriptionIndexRef.current >= patientData.transcription.length) {
            // Process the complete transcription for symptoms and vitals after a short delay
            setTimeout(() => {
              detectSymptomsAndVitals(fullTranscription);
            }, 1000); // 1 second delay after transcription completes
            
            if (transcriptionIntervalRef.current) {
              clearInterval(transcriptionIntervalRef.current);
            }
          }
        }
      }, 500);
    } catch (err) {
      console.error('Error starting playback:', err);
      setError('Failed to start audio playback');
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
    }
    
    setIsPlaying(false);
  };

  const resetData = () => {
    setSymptoms([]);
    setVitals({});
    setTranscription('');
    
    const emptyData: DiagnosisResult = {
      diagnoses: [],
      symptoms: [],
      vitals: {}
    };
    storeCurrentDiagnosis(emptyData);
  };

  const detectSymptomsAndVitals = async (transcript: string) => {
    try {
      setIsAnalyzing(true);
      
      const response = await fetch('/api/detect-symptoms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript })
      });
  
      if (!response.ok) throw new Error('Failed to detect medical information');
      
      const { symptoms: detectedSymptoms, vitals: detectedVitals } = await response.json();
      
      setSymptoms(prevSymptoms => {
        const validSymptoms = detectedSymptoms
          .filter((symptom: string) => 
            symptom !== '[comma-separated list]' && 
            symptom !== 'comma-separated list' &&
            symptom.trim() !== '' &&
            !symptom.includes('{') &&
            !symptom.includes('}')
          );
  
        const existingSymptoms = new Set(prevSymptoms.map(s => s.name.toLowerCase()));
        const newSymptoms = validSymptoms
          .filter((symptom: string) => !existingSymptoms.has(symptom.toLowerCase()))
          .map((symptom: string) => ({
            name: symptom.charAt(0).toUpperCase() + symptom.slice(1),
            detected: true
          }));
        
        return [...prevSymptoms, ...newSymptoms];
      });
  
      if (detectedVitals) {
        setVitals(prev => {
          const newVitals: Vitals = { ...prev };
          
          if (detectedVitals.temperature?.match(/^\d+(?:\.\d+)?°F$/)) {
            newVitals.temperature = detectedVitals.temperature;
          }
          if (detectedVitals.bloodPressure?.match(/^\d+\/\d+\s*mmHg$/)) {
            newVitals.bloodPressure = detectedVitals.bloodPressure;
          }
          if (detectedVitals.pulse?.match(/^\d+\s*bpm$/)) {
            newVitals.pulse = detectedVitals.pulse;
          }
          
          return newVitals;
        });
      }
  
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Error detecting medical information:', error);
      setError('Failed to analyze medical information');
      setIsAnalyzing(false);
    }
  };

  const getFlagColor = (flag: string): string => {
    switch (flag.toLowerCase()) {
      case 'high':
        return 'text-red-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-500';
    }
  };

  const abnormalLabResults = labResults.filter(lab => {
    const flag = lab.flag ? lab.flag.toLowerCase().trim() : '';
    return flag === 'high' || flag === 'low';
  });

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto p-4 overflow-y-auto">
        <div className="flex justify-end mb-4">
          <div className="flex items-center">
            <label htmlFor="patient-select" className="mr-2 text-black">Patient ID:</label>
            <select
              id="patient-select"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="bg-white border border-gray-300 rounded-md px-3 py-1 text-black"
            >
              {patientIds.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-[#80BCFF]">
                  Current Symptoms
                  {isAnalyzing && <span className="ml-2 text-sm text-gray-500">(Analyzing...)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {symptoms.map((symptom) => (
                    <div 
                      key={symptom.name} 
                      className="p-2 rounded text-black"
                    >
                      {symptom.name}
                    </div>
                  ))}
                  {symptoms.length === 0 && !isAnalyzing && (
                    <div className="text-black">No symptoms detected</div>
                  )}
                  {isAnalyzing && symptoms.length === 0 && (
                    <div className="text-gray-500">Analyzing symptoms...</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-[#80BCFF]">Current Vitals</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-black">
                    <span>Temperature</span>
                    <span>{vitals.temperature || "Value"}</span>
                  </div>
                  <div className="flex justify-between text-black">
                    <span>Blood Pressure</span>
                    <span>{vitals.bloodPressure || "Value"}</span>
                  </div>
                  <div className="flex justify-between text-black">
                    <span>Pulse</span>
                    <span>{vitals.pulse || "Value"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="py-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-[#80BCFF]">Live Transcription</CardTitle>
                  <div className="flex gap-2">
                    <button 
                      onClick={isPlaying ? stopPlayback : startPlayback}
                      className={`${isPlaying ? 'bg-red-500' : 'bg-green-500'} text-white px-4 py-1 rounded-md flex items-center gap-2`}
                    >
                      <span className={`h-2 w-2 rounded-full bg-white ${isPlaying ? 'animate-pulse' : ''}`}></span>
                      {isPlaying ? 'Stop Playback' : 'Start Playback'}
                    </button>
                    <button 
                      onClick={resetData}
                      className="bg-gray-500 text-white px-4 py-1 rounded-md flex items-center gap-2"
                      disabled={isPlaying}
                    >
                      Reset
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="h-[150px] bg-gray-50 rounded-md p-3 text-black overflow-y-auto">
                    {error ? (
                      <div className="text-red-500">{error}</div>
                    ) : (
                      transcription || "Waiting for audio input..."
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="w-full">
                <div className="m-4 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <CardTitle className="text-[#80BCFF] mb-2">Abnormal Lab Results</CardTitle>
                      {labTestDate && (
                        <div className="text-sm text-gray-500 mb-2">Test Date: {labTestDate}</div>
                      )}
                      
                      <div className="space-y-2 text-black max-h-[300px] overflow-y-auto pr-2">
                        {abnormalLabResults.length > 0 ? (
                          abnormalLabResults.map((item, index) => {
                            console.log(`Rendering item ${index}:`, item);
                            return (
                              <div key={index} className="flex justify-between items-center mb-1 py-1 border-b">
                                <span className="text-sm font-medium">{item.name}</span>
                                <div className="flex items-center">
                                  <span className={`text-sm mr-2 ${getFlagColor(item.flag || '')}`}>
                                    {item.value}{item.unit ? ` ${item.unit}` : ''}
                                  </span>
                                  <span 
                                    className={`text-xs px-1.5 py-0.5 rounded ${
                                      item.flag?.toLowerCase().trim() === 'high' 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {item.flag}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div>No abnormal lab results detected ({labResults.length} total lab results available)</div>
                        )}
                      </div>
                      
                      {labResults.length > 0 && (
                        <div className="text-xs text-gray-500 mt-2">
                          {labResults.length - abnormalLabResults.length} normal lab results not shown
                          (Debug: {abnormalLabResults.length} abnormal results showing)
                        </div>
                      )}
                    </div>

                    <div>
                      <CardTitle className="text-[#80BCFF] mb-4">Medical History</CardTitle>
                      <div className="max-h-[300px] overflow-y-auto pr-2">
                        <div className="mb-4">
                          <h4 className="text-black font-bold mb-2">Active Conditions</h4>
                          {medicalHistory.activeConditions.map((item, index) => (
                            <div key={index} className="bg-gray-50 mb-2 p-2 rounded">
                              <div className="text-sm font-medium text-black">{item.condition}</div>
                              <div className="text-xs text-black">Diagnosed: {item.date}</div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <h4 className="text-black font-bold mb-2">Current Medication</h4>
                          {medicalHistory.currentMedication.map((item, index) => (
                            <div key={index} className="bg-gray-50 mb-2 p-2 rounded">
                              <div className="text-sm font-medium text-black">{item.name}</div>
                              <div className="text-xs text-black">{item.dosage}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-8">
                    <button 
                      onClick={() => {
                        const currentData: DiagnosisResult = {
                          diagnoses: [],
                          symptoms: symptoms.map(s => s.name),
                          vitals: vitals,
                          medicalHistory: medicalHistory,
                          labResults: labResults,
                          labTestDate: labTestDate
                        };
                        storeCurrentDiagnosis(currentData);
                        
                        const symptomsParam = encodeURIComponent(symptoms.map(s => s.name).join(','));
                        router.push(`/scan?symptoms=${symptomsParam}&patientId=${selectedPatientId}`);
                      }}
                      className="bg-[#80BCFF] text-white px-8 py-2 rounded-lg flex items-center gap-1"
                    >
                      Next <span className="text-lg">→</span>
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}