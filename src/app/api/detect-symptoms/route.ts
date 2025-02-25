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

    // Modified prompt 
    const prompt = `[INST] You are a medical assistant. Extract medical information from this text and format it exactly as shown below. Only output the formatted data, no other text:

"${transcript}"

Format:
Temperature: {number}°F
Blood Pressure: {systolic}/{diastolic} mmHg
Pulse: {number} bpm
Symptoms: {symptom1}, {symptom2}, etc.

Convert any written numbers to digits (e.g., "one zero two" to "102"). [/INST]`;

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
      let responseText = '';
      if (typeof response === 'string') {
        responseText = response.toLowerCase();
      } else if (Array.isArray(response)) {
        responseText = (response[0]?.generated_text || '').toLowerCase();
      }

      // Enhanced temperature detection with support for written numbers
      const tempMatch = responseText.match(/temperature[:\s]*(\d+(?:\.\d+)?)/i) ||
        transcript.match(/temperature\s*(?:is|of)?\s*(?:one|two|three|four|five|six|seven|eight|nine|zero|\d+)(?:\s+(?:one|two|three|four|five|six|seven|eight|nine|zero|\d+))*\s*(?:fahrenheit|f)?/i);
      
      if (tempMatch) {
        let temp;
        if (tempMatch[0].match(/one|two|three|four|five|six|seven|eight|nine|zero/i)) {
          // Convert written numbers to digits
          temp = tempMatch[0]
            .replace(/temperature\s*(?:is|of)?\s*/i, '')
            .replace(/fahrenheit|f/i, '')
            .replace(/one/gi, '1')
            .replace(/two/gi, '2')
            .replace(/three/gi, '3')
            .replace(/four/gi, '4')
            .replace(/five/gi, '5')
            .replace(/six/gi, '6')
            .replace(/seven/gi, '7')
            .replace(/eight/gi, '8')
            .replace(/nine/gi, '9')
            .replace(/zero/gi, '0')
            .replace(/\s+/g, '')
            .trim();
        } else {
          temp = tempMatch[1];
        }
        vitals.temperature = `${temp}°F`;
      }

      // Blood pressure detection
      const bpMatch = responseText.match(/blood pressure[:\s]*(\d+)\/(\d+)/i);
      if (bpMatch) {
        vitals.bloodPressure = `${bpMatch[1]}/${bpMatch[2]} mmHg`;
      }

      // Pulse detection
      const pulseMatch = responseText.match(/pulse[:\s]*(\d+)/i);
      if (pulseMatch) {
        vitals.pulse = `${pulseMatch[1]} bpm`;
      }

      // Symptom detection from model response
      const symptomsMatch = responseText.match(/symptoms[:\s]*([^\n]+)/i);
      if (symptomsMatch) {
        detectedSymptoms = symptomsMatch[1]
          .split(/[,.]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }

      // Additional symptom detection from transcript
      const lowerTranscript = transcript.toLowerCase();
      commonSymptoms.forEach(symptom => {
        if (lowerTranscript.includes(symptom) && !detectedSymptoms.includes(symptom)) {
          detectedSymptoms.push(symptom);
        }
      });

      // Add fever to symptoms if temperature is high
      if (
        (lowerTranscript.includes('fever') || 
        (vitals.temperature && parseFloat(vitals.temperature) > 99)) && 
        !detectedSymptoms.includes('fever')
      ) {
        detectedSymptoms.push('fever');
      }

    } catch (parseError) {
      console.error('Error parsing LLM response:', parseError);
      
      // Fallback to direct transcript analysis
      const lowerTranscript = transcript.toLowerCase();
      detectedSymptoms = commonSymptoms.filter(symptom =>
        lowerTranscript.includes(symptom)
      );
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