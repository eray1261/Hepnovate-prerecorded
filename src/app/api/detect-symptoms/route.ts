import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const commonSymptoms = [
    'headache', 'fever', 'pain', 'nausea', 'cough', 
    'sore throat', 'fatigue', 'dizziness'
];

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json();
    if (!transcript || transcript.trim() === '') {
      return NextResponse.json({
        symptoms: [],
        vitals: { temperature: null, bloodPressure: null, pulse: null },
      });
    }

    // Improved prompt with clearer instructions and handling of edge cases
    const prompt = `[INST] You are a medical assistant with expertise in extracting clinical information.

Extract the following medical information from this text and format it EXACTLY as shown below. 
ONLY output the formatted data, NO other text:

"${transcript}"

Format:
Temperature: {number}°F (leave empty if not mentioned)
Blood Pressure: {systolic}/{diastolic} mmHg (leave empty if not mentioned)
Pulse: {number} bpm (leave empty if not mentioned)
Symptoms: {symptom1}, {symptom2}, etc. (leave empty if none mentioned)

Important rules:
1. Convert any spelled-out numbers to digits (e.g., "one zero two" → "102")
2. Only include real medical symptoms in the Symptoms field
3. If you see something like "of one zero two", it's likely "102°F" 
4. Don't include non-symptoms like numbers or test results in the Symptoms list
5. If a field has no corresponding information, leave it empty (don't write "not mentioned")
6. Make sure to properly parse phrases like "blood pressure of 60 over 70" as "60/70 mmHg"
[/INST]`;

    const response = await hf.request({
      model: 'mistralai/Mistral-7B-Instruct-v0.3',
      inputs: prompt,
      parameters: {
        max_new_tokens: 256,
        temperature: 0.1,
        top_p: 0.95,
        do_sample: true,
        return_full_text: false
      },
    });

    let detectedSymptoms: string[] = [];
    let vitals: { temperature: string | null; bloodPressure: string | null; pulse: string | null } = {
      temperature: null,
      bloodPressure: null,
      pulse: null,
    };      

    try {
      // Parse the model response
      let responseText = '';
      if (typeof response === 'string') {
        responseText = response;
      } else if (Array.isArray(response)) {
        responseText = response[0]?.generated_text || '';
      }

      // Temperature detection
      const tempMatch = responseText.match(/Temperature:\s*(\d+(?:\.\d+)?°F)/i);
      if (tempMatch && tempMatch[1]) {
        vitals.temperature = tempMatch[1];
      }

      // Blood pressure detection
      const bpMatch = responseText.match(/Blood Pressure:\s*(\d+\/\d+\s*mmHg)/i);
      if (bpMatch && bpMatch[1]) {
        vitals.bloodPressure = bpMatch[1];
      }

      // Pulse detection
      const pulseMatch = responseText.match(/Pulse:\s*(\d+\s*bpm)/i);
      if (pulseMatch && pulseMatch[1]) {
        vitals.pulse = pulseMatch[1];
      }

      // Symptom detection
      const symptomsMatch = responseText.match(/Symptoms:\s*([^\n]+)/i);
      if (symptomsMatch && symptomsMatch[1] && symptomsMatch[1].trim() !== '') {
        // Split by commas and clean up
        detectedSymptoms = symptomsMatch[1]
          .split(/,/)
          .map(s => s.trim())
          .filter(s => 
            s.length > 0 && 
            !s.includes('none') && 
            !s.includes('not mentioned') &&
            !s.includes('{') &&
            !s.includes('}')
          )
          .map(s => {
            // Capitalize first letter
            return s.charAt(0).toUpperCase() + s.slice(1);
          });
      }

      // If no symptoms were extracted from LLM but we have common symptoms in transcript
      if (detectedSymptoms.length === 0) {
        const lowerTranscript = transcript.toLowerCase();
        
        // Check for direct mentions of common symptoms as fallback
        const fallbackSymptoms = commonSymptoms.filter(symptom => {
          const regex = new RegExp(`\\b${symptom}\\b`, 'i');
          return regex.test(lowerTranscript);
        });
        
        detectedSymptoms = fallbackSymptoms.map(
          s => s.charAt(0).toUpperCase() + s.slice(1)
        );
      }

      // Add fever to symptoms if temperature is high
      if (
        !detectedSymptoms.some(s => s.toLowerCase() === 'fever') && 
        vitals.temperature && 
        parseFloat(vitals.temperature) > 99
      ) {
        detectedSymptoms.push('Fever');
      }

      // Remove any duplicates (case insensitive)
      detectedSymptoms = Array.from(
        new Set(detectedSymptoms.map(s => s.toLowerCase()))
      ).map(s => s.charAt(0).toUpperCase() + s.slice(1));

    } catch (parseError) {
      console.error('Error parsing LLM response:', parseError);
      
      // Simple fallback
      const lowerTranscript = transcript.toLowerCase();
      detectedSymptoms = commonSymptoms
        .filter(symptom => lowerTranscript.includes(symptom))
        .map(s => s.charAt(0).toUpperCase() + s.slice(1));
    }

    return NextResponse.json({
      symptoms: detectedSymptoms,
      vitals: vitals,
    });
  } catch (error) {
    console.error('Detection error:', error);
    return NextResponse.json(
      { error: 'Failed to process medical information' },
      { status: 500 }
    );
  }
}