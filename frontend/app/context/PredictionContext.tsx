'use client';

import { createContext, useState, useContext, ReactNode } from 'react';

// 1. Define the shape of a single prediction result
interface PredictionResult {
  closest_db_lat: number;
  closest_db_lon: number;
  prediction: number;
}

// 2. Define the shape of the context's state and methods
interface PredictionContextType {
  predictionResults: PredictionResult[];
  panToLocation: [number, number] | null;
  addPrediction: (result: PredictionResult) => void;
}

// 3. Create the context with a default undefined value
const PredictionContext = createContext<PredictionContextType | undefined>(undefined);

// 4. Create the Provider component
interface PredictionProviderProps {
  children: ReactNode;
}

export function PredictionProvider({ children }: PredictionProviderProps) {
  const [predictionResults, setPredictionResults] = useState<PredictionResult[]>([]);
  const [panToLocation, setPanToLocation] = useState<[number, number] | null>(null);

  const addPrediction = (result: PredictionResult) => {
    setPredictionResults(prevResults => [...prevResults, result]);
    setPanToLocation([result.closest_db_lat, result.closest_db_lon]);
  };

  const value = {
    predictionResults,
    panToLocation,
    addPrediction,
  };

  return (
    <PredictionContext.Provider value={value}>
      {children}
    </PredictionContext.Provider>
  );
}

// 5. Create a custom hook for easy access to the context
export function usePrediction() {
  const context = useContext(PredictionContext);
  if (context === undefined) {
    throw new Error('usePrediction must be used within a PredictionProvider');
  }
  return context;
}