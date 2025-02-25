// services/diagnosisStorage.ts

/**
 * Types matching your existing diagnosis structure
 */
export type Diagnosis = {
    name: string;
    confidence: number;
    findings: string[];
    differential: string[];
    plan: string[];
    severity: 'Mild' | 'Moderate' | 'Severe';
  }
  
  /**
   * Structure for diagnosis result with additional image and symptom data
   */
  export interface DiagnosisResult {
    diagnoses: Diagnosis[];
    imageData?: string;  // Base64 image data for reuse in feedback flow
    symptoms?: string[]; // Symptoms for reuse in feedback flow
  }
  
  // Storage keys
  const CURRENT_DIAGNOSIS_KEY = 'diagnosisResult';
  const DIAGNOSIS_HISTORY_KEY = 'diagnosisHistory';
  const MAX_HISTORY_LENGTH = 5;
  
  /**
   * Stores the current diagnosis result
   */
  export const storeCurrentDiagnosis = (diagnosis: DiagnosisResult): void => {
    localStorage.setItem(CURRENT_DIAGNOSIS_KEY, JSON.stringify(diagnosis));
    
    // Also add to history
    try {
      const historyJson = localStorage.getItem(DIAGNOSIS_HISTORY_KEY);
      const history: Array<DiagnosisResult & { timestamp: string }> = historyJson ? JSON.parse(historyJson) : [];
      
      // Add timestamp to help identify it
      const diagnosisWithTimestamp = {
        ...diagnosis,
        timestamp: new Date().toISOString()
      };
      
      // Add to the beginning (most recent first)
      history.unshift(diagnosisWithTimestamp);
      
      // Limit history size
      if (history.length > MAX_HISTORY_LENGTH) {
        history.pop();
      }
      
      localStorage.setItem(DIAGNOSIS_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving diagnosis history:', error);
    }
  };
  
  /**
   * Gets the current diagnosis result
   */
  export const getCurrentDiagnosis = (): DiagnosisResult | null => {
    try {
      const data = localStorage.getItem(CURRENT_DIAGNOSIS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting current diagnosis:', error);
      return null;
    }
  };
  
  /**
   * Gets the diagnosis history
   */
  export const getDiagnosisHistory = (): Array<DiagnosisResult & { timestamp: string }> => {
    try {
      const historyJson = localStorage.getItem(DIAGNOSIS_HISTORY_KEY);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
      console.error('Error getting diagnosis history:', error);
      return [];
    }
  };
  
  /**
   * Clears the current diagnosis (usually after completing workflow)
   */
  export const clearCurrentDiagnosis = (): void => {
    localStorage.removeItem(CURRENT_DIAGNOSIS_KEY);
  };
  
  /**
   * Clears all diagnosis data (current and history)
   */
  export const clearAllDiagnosisData = (): void => {
    localStorage.removeItem(CURRENT_DIAGNOSIS_KEY);
    localStorage.removeItem(DIAGNOSIS_HISTORY_KEY);
  };