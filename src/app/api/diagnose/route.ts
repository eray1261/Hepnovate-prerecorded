// /Users/eshanikaray/hepnovate/src/app/api/diagnose/route.ts

import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

interface Diagnosis {
  name: string;
  confidence: number;
  findings: string[];
  differential: string[];
  plan: string[];
  severity: 'Mild' | 'Moderate' | 'Severe';
}

interface DiagnosisResponse {
  diagnoses: Diagnosis[];
}

interface HuggingFaceResponse {
  generated_text: string;
}

interface MedicalCondition {
    condition: string;
    date: string;
}
  
interface Medication {
    name: string;
    dosage: string;
}
  
interface MedicalHistoryData {
    activeConditions?: MedicalCondition[];
    currentMedication?: Medication[];
}
  
interface LabResultData {
    name: string;
    value: string;
    unit?: string;
}

async function parseWithLLM(text: string): Promise<DiagnosisResponse> {
    const parsingPrompt = `<s>[INST] You are a medical data extraction specialist. Parse the following medical analysis into a structured JSON format. Extract only the meaningful medical content, not any template text or placeholders.
  
  Medical Analysis:
  ${text}
  
  Create valid JSON with exactly this structure:
  {
    "diagnoses": [
      {
        "name": "Primary diagnosis name",
        "confidence": number between 0-100 (default 75 if not specified),
        "findings": ["specific finding 1", "specific finding 2", ...],
        "differential": ["alternative diagnosis 1", "alternative diagnosis 2", ...],
        "plan": ["treatment step 1", "treatment step 2", ...],
        "severity": "Mild" OR "Moderate" OR "Severe"
      }
    ]
  }
  
  Important instructions:
  1. "name" should be the specific medical condition diagnosed, not generic headers
  2. "confidence" should be the numerical recovery rate percentage or likelihood (default to 75 if unspecified)
  3. "findings" should include key observations from both image analysis and reasoning sections
  4. "differential" should list alternative possible diagnoses
  5. "plan" should list specific, actionable treatment steps
  6. "severity" must be exactly one of: "Mild", "Moderate", or "Severe"
  7. Remove any template placeholders like "[List specific treatments]"
  8. Format all list items as complete, meaningful medical statements
  9. The final format must be valid, parseable JSON that exactly matches the schema above
  
  Return only the JSON, with no additional text before or after. [/INST]</s>`;
  
    try {
      console.log('=== SENDING PARSING PROMPT TO MISTRAL ===');
      console.log(parsingPrompt);
      
      const response = await hf.request({
        model: 'mistralai/Mistral-7B-Instruct-v0.3',
        inputs: parsingPrompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.1,
          return_full_text: false
        }
      }) as HuggingFaceResponse[];
  
      console.log('=== MISTRAL PARSING MODEL RESPONSE ===');
      console.log(JSON.stringify(response, null, 2));
  
      if (!response?.[0]?.generated_text) {
        throw new Error('Invalid parsing response');
      }
  
      // Clean the response text to ensure valid JSON
      let responseText = response[0].generated_text.trim();
      
      // Handle code blocks with backticks - improved extraction
      if (responseText.includes("```json")) {
        const parts = responseText.split("```json");
        if (parts.length > 1 && parts[1].includes("```")) {
          responseText = parts[1].split("```")[0].trim();
        }
      } else if (responseText.includes("```")) {
        const parts = responseText.split("```");
        if (parts.length > 1) {
          responseText = parts[1].trim();
        }
      }
      
      // Try to extract just the JSON object with diagnoses
      const jsonMatch = responseText.match(/\{\s*"diagnoses"\s*:\s*\[[\s\S]*?\}\s*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      // Fix common JSON formatting issues
      responseText = responseText
        .replace(/,\s*}/g, '}')           // Remove trailing commas in objects
        .replace(/,\s*]/g, ']')           // Remove trailing commas in arrays
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')  // Ensure property names are quoted
        .replace(/\\"/g, '"')             // Handle escaped quotes
        .replace(/\\n/g, ' ');            // Replace newlines with spaces
  
      // Try parsing with better error handling
      let parsedJson;
      try {
        parsedJson = JSON.parse(responseText);
      } catch (initialError) {
        console.error('Initial JSON parsing failed:', initialError);
        console.log('Attempting to fix problematic JSON:', responseText);
        
        // Try additional fixes if initial parsing fails
        try {
          // Remove any non-standard characters
          responseText = responseText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          
          // Try to extract just the diagnoses array as a last resort
          const diagnosesMatch = responseText.match(/"diagnoses"\s*:\s*(\[[\s\S]*?\])/);
          if (diagnosesMatch) {
            const diagnosesArray = JSON.parse(diagnosesMatch[1]);
            parsedJson = { diagnoses: diagnosesArray };
          } else {
            throw new Error('Could not extract diagnoses array');
          }
        } catch (secondError) {
          console.error('Additional JSON parsing attempts failed:', secondError);
          throw initialError; // Throw the original error
        }
      }
      
      // Ensure the response follows our expected structure
      if (!parsedJson.diagnoses || !Array.isArray(parsedJson.diagnoses)) {
        throw new Error('Invalid response structure: missing diagnoses array');
      }
  
      // Validate and clean each diagnosis
      const validatedDiagnoses = parsedJson.diagnoses.map((diag: any) => {
        return {
          name: diag.name || 'Unspecified Condition',
          confidence: typeof diag.confidence === 'number' ? Math.min(Math.max(diag.confidence, 0), 100) : 75,
          findings: Array.isArray(diag.findings) ? diag.findings : [],
          differential: Array.isArray(diag.differential) ? diag.differential : [],
          plan: Array.isArray(diag.plan) ? diag.plan : [],
          severity: ['Mild', 'Moderate', 'Severe'].includes(diag.severity) 
            ? diag.severity as 'Mild' | 'Moderate' | 'Severe'
            : 'Moderate'
        };
      });
  
      return { diagnoses: validatedDiagnoses };
    } catch (error) {
      console.error('Error parsing with Mistral:', error);
      // Fallback to a basic structured response
      return {
        diagnoses: [{
          name: 'Unspecified Condition',
          confidence: 75,
          findings: [],
          differential: [],
          plan: [],
          severity: 'Moderate'
        }]
      };
    }
  }

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      imageBase64, 
      symptoms = [], 
      feedback = "", 
      previousDiagnosis = null,
      vitals = {},
      labResults = [],
      medicalHistory = {} 
    } = body;

    if (!imageBase64) {
      console.error('Missing image data');
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(imageBase64, 'base64');
    } catch (error) {
      console.error('Error decoding Base64 image:', error);
      return NextResponse.json({ error: 'Invalid Base64 image' }, { status: 400 });
    }

    // Build the prompt, incorporating feedback if provided
    let prompt = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>
<|image|>You are a medical AI assistant. Analyze this medical scan image along with the following patient symptoms: ${symptoms.join(', ')}.`;

    // Add vitals if available
    if (vitals && Object.keys(vitals).length > 0) {
      const vitalEntries = Object.entries(vitals).filter(([_, value]) => value);
      if (vitalEntries.length > 0) {
        const vitalsList = vitalEntries.map(([key, value]) => `${key}: ${value}`).join(', ');
        prompt += `\n\nPatient vitals: ${vitalsList}`;
      }
    }

    // Add lab results if available
    if (labResults && labResults.length > 0) {
        const labsList = labResults
          .map((lab: LabResultData) => `${lab.name}: ${lab.value}${lab.unit ? ' ' + lab.unit : ''}`)
          .join(', ');
        if (labsList) {
          prompt += `\n\nLab results: ${labsList}`;
        }
      }

    // Add medical history if available
    if (medicalHistory) {
        let historyText = '';
        
        if (medicalHistory.activeConditions && medicalHistory.activeConditions.length > 0) {
          const conditions = medicalHistory.activeConditions
            .map((c: MedicalCondition) => `${c.condition} (diagnosed: ${c.date})`)
            .join(', ');
          historyText += `Active conditions: ${conditions}. `;
        }
        
        if (medicalHistory.currentMedication && medicalHistory.currentMedication.length > 0) {
          const medications = medicalHistory.currentMedication
            .map((m: Medication) => `${m.name} ${m.dosage}`)
            .join(', ');
          historyText += `Current medications: ${medications}.`;
        }
        
        if (historyText) {
          prompt += `\n\nMedical history: ${historyText}`;
        }
    }

    // Add feedback context if provided
    if (feedback) {
      prompt += `\n\nIMPORTANT: A physician reviewed a previous analysis and provided this feedback: "${feedback}"`;
    }

    // If previous diagnosis is provided, reference it for comparison
    if (previousDiagnosis) {
      prompt += `\n\nThe previous diagnosis was ${previousDiagnosis.name} with ${previousDiagnosis.confidence}% confidence and ${previousDiagnosis.severity.toLowerCase()} severity. Please reconsider based on the feedback.`;
    }

    prompt += `\n\nProvide a detailed analysis in the following format:

## Medical Scan Image Analysis
- [Describe 3-5 key findings visible in the scan]
- [Note any abnormalities or areas of concern]

## Primary Diagnosis
[State the most specific and likely diagnosis based on imaging and symptoms]

## Reasoning
- [List 2-4 specific pieces of evidence supporting the diagnosis]
- [Explain how symptoms and imaging findings correlate]

## Treatment Plan
- [Recommend 2-4 specific treatments or interventions]
- [Include necessary medications or procedures with details]

## Differential Diagnoses
- [List 2-3 other possible conditions to consider]

## Severity and Prognosis
Severity: [Choose exactly one: Mild, Moderate, or Severe]
Expected recovery rate: [Provide a specific percentage between 0-100]%

Be specific, detailed, and clear in your analysis. ${feedback ? 'Address the physician\'s feedback directly.' : 'Avoid vague statements or placeholders.'}
<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

    console.log('=== SENDING PROMPT TO LLAMA VISION MODEL ===');
    console.log(prompt);

    let response;
    try {
      response = await hf.request({
        model: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
        inputs: prompt,
        image: imageBuffer,
        parameters: { 
          max_new_tokens: 1000, 
          temperature: 0.2,
          top_p: 0.9,
          return_full_text: true
        },
      }) as HuggingFaceResponse[];
      
      console.log('=== LLAMA VISION MODEL RESPONSE ===');
      console.log(JSON.stringify(response, null, 2));
      
    } catch (error) {
      console.error('Error calling Llama Vision API:', error);
      return NextResponse.json({ error: 'Vision model API request failed' }, { status: 500 });
    }

    if (!response?.[0]?.generated_text) {
      console.error('Invalid API response structure:', response);
      return NextResponse.json({ error: 'No generated text in response' }, { status: 500 });
    }

    // Parse the response using Mistral model
    const formattedResponse = await parseWithLLM(response[0].generated_text);

    console.log('=== FINAL STRUCTURED RESPONSE ===');
    console.log(JSON.stringify(formattedResponse, null, 2));

    if (!formattedResponse.diagnoses?.[0]) {
      console.error('Invalid response structure after parsing:', formattedResponse);
      return NextResponse.json({ error: 'Failed to parse diagnosis response' }, { status: 500 });
    }

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error('Diagnosis error:', error);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}