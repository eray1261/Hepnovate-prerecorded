// /app/api/writeup/route.ts

import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

interface WriteUpRequest {
  diagnoses: any[];
  symptoms: string[];
  vitals?: any;
  labResults?: any[];
  medicalHistory?: any;
  physicianAssessment?: string;
  imageData?: string;
}

// This interface should match the one in your diagnose route
interface HuggingFaceResponse {
  generated_text: string;
}

export async function POST(request: Request) {
  try {
    const body: WriteUpRequest = await request.json();
    const { diagnoses, symptoms, vitals, labResults, medicalHistory, physicianAssessment } = body;
    
    if (!diagnoses || diagnoses.length === 0) {
      return NextResponse.json({ error: 'Missing diagnosis data' }, { status: 400 });
    }

    // Primary diagnosis is the first one
    const primaryDiagnosis = diagnoses[0];
    
    // Build prompt for Mistral to create the structured write-up
    const writeUpPrompt = `<s>[INST] You are a medical documentation specialist. Create a formal medical write-up (History and Physical) based on the following diagnosis information. Follow proper medical documentation format.

DIAGNOSIS INFORMATION:
Primary Diagnosis: ${primaryDiagnosis.name}
Severity: ${primaryDiagnosis.severity}
Confidence: ${primaryDiagnosis.confidence}%
Clinical Findings: ${primaryDiagnosis.findings.join(', ')}
Differential Diagnoses: ${primaryDiagnosis.differential.join(', ')}
Treatment Plan: ${primaryDiagnosis.plan.join(', ')}

${symptoms.length > 0 ? `Patient Symptoms: ${symptoms.join(', ')}` : ''}
${vitals ? `Vitals: ${JSON.stringify(vitals)}` : ''}
${labResults && labResults.length > 0 ? `Lab Results: ${JSON.stringify(labResults)}` : ''}
${medicalHistory ? `Medical History: ${JSON.stringify(medicalHistory)}` : ''}
${physicianAssessment ? `Physician Assessment: ${physicianAssessment}` : ''}

Create a complete medical write-up with the following sections:
1. Chief Concern (CC): A brief statement of why the patient is seeking care
2. History of Present Illness (HPI): Detailed narrative of the symptoms and their progression
3. Past Medical History (PMH): If available
4. Past Surgical History (PSH): If available
5. Medications: If available
6. Allergies: If available
7. Social History: If available
8. Family History: If available
9. Review of Systems (ROS): Brief, focused on relevant systems
10. Physical Examination: Create plausible findings consistent with the diagnosis
11. Lab Results/Studies: Include any provided lab values
12. Assessment: Summarize findings and state primary diagnosis with confidence
13. Plan: Detailed treatment approach based on the provided plan

Focus on making this document professionally formatted and medically sound. Use proper medical terminology. Make reasonable assumptions for any missing information based on the diagnosis. [/INST]</s>`;

    console.log('=== SENDING WRITE-UP PROMPT TO MISTRAL ===');
    
    // Add the type assertion here
    const response = await hf.request({
      model: 'mistralai/Mistral-7B-Instruct-v0.3',
      inputs: writeUpPrompt,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.1,
        return_full_text: false
      }
    }) as HuggingFaceResponse[];

    if (!response?.[0]?.generated_text) {
      throw new Error('Invalid response from Mistral');
    }

    const writeUpText = response[0].generated_text.trim();
    
    return NextResponse.json({ writeUp: writeUpText });
  } catch (error) {
    console.error('Write-up generation error:', error);
    return NextResponse.json({ error: 'Failed to generate write-up' }, { status: 500 });
  }
}