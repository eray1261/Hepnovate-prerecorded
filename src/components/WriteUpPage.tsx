// Save this file at: /src/components/WriteUpPage.tsx
// This is the same content as the earlier "Medical Write-Up Page Component" artifact

"use client";

import { useEffect, useState } from 'react';
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/card";
import { ArrowLeft, Download, Edit, Save } from "lucide-react";
import { useRouter } from 'next/navigation';
import { getCurrentDiagnosis, storeWriteUp } from '@/services/diagnosisStorage';

export default function WriteUpPage() {
  const [writeUp, setWriteUp] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedWriteUp, setEditedWriteUp] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const generateWriteUp = async () => {
      try {
        // Get the current diagnosis from storage
        const diagnosisData = getCurrentDiagnosis();
        
        if (!diagnosisData) {
          alert('No diagnosis data found');
          router.push('/diagnosis');
          return;
        }

        setIsLoading(true);

        // Call the write-up API
        const response = await fetch('/api/writeup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            diagnoses: diagnosisData.diagnoses,
            symptoms: diagnosisData.symptoms || [],
            vitals: diagnosisData.vitals || {},
            labResults: diagnosisData.labResults || [],
            medicalHistory: diagnosisData.medicalHistory || {},
            physicianAssessment: localStorage.getItem('physicianAssessment') || ''
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate write-up');
        }

        const data = await response.json();
        setWriteUp(data.writeUp);
        setEditedWriteUp(data.writeUp);
        
        // Store the write-up for future reference
        storeWriteUp(data.writeUp);
      } catch (error) {
        console.error('Error generating write-up:', error);
        alert('Failed to generate write-up. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    generateWriteUp();
  }, [router]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedWriteUp(writeUp);
  };

  const handleSave = () => {
    setWriteUp(editedWriteUp);
    storeWriteUp(editedWriteUp); // Save edited version
    setIsEditing(false);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([writeUp], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `medical-write-up-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Format sections with headers in bold
  const formatWriteUp = (text: string) => {
    // Replace section headers with bold text
    const formattedText = text.replace(
      /^(.*?:)(.*)$/gm, 
      (match, header, content) => `<strong>${header}</strong>${content}`
    );
    
    return formattedText;
  };

  if (isLoading) {
    return (
      <main className="bg-white flex flex-col min-h-screen">
        <Header />
        <div className="container mx-auto p-4 flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#80BCFF] mx-auto mb-4"></div>
            <p className="text-gray-600">Generating medical write-up...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-white flex flex-col min-h-screen">
      <Header />
      <div className="container mx-auto p-4 flex-1">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => router.push('/diagnosis')}
            className="flex items-center text-[#80BCFF] hover:underline"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Diagnosis
          </button>
          <div className="flex gap-2">
            {isEditing ? (
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center gap-2"
              >
                <Save size={16} />
                Save Changes
              </button>
            ) : (
              <button 
                onClick={handleEdit}
                className="px-4 py-2 bg-gray-200 text-black rounded-lg flex items-center gap-2"
              >
                <Edit size={16} />
                Edit
              </button>
            )}
            <button 
              onClick={handleDownload}
              className="px-4 py-2 bg-[#80BCFF] text-white rounded-lg flex items-center gap-2"
            >
              <Download size={16} />
              Download
            </button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#80BCFF]">Medical Write-Up</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <textarea
              value={editedWriteUp}
              onChange={(e) => setEditedWriteUp(e.target.value)}
              className="w-full h-[70vh] p-4 border rounded-lg resize-none font-mono text-sm text-black focus:outline-none focus:ring-1 focus:ring-[#80BCFF]"
            />
            ) : (
              <div 
                className="prose max-w-full font-serif text-black whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: formatWriteUp(writeUp) }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}