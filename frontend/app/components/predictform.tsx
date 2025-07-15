"use client"

import { useState } from "react";
import { usePrediction } from "../context/PredictionContext";
import { API_URL } from "../lib";

export default function PredictForm() {
  const [showForm, setShowForm] = useState(false);
  const { addPrediction } = usePrediction();
  const [formData, setFormData] = useState({
    lat: "",
    lon: "",
    date: "",
    temperature_2m_max: "",
    temperature_2m_min: "",
    rain_sum: "",
    snowfall_sum: "",
    windspeed_10m_max: "",
    surface_pressure_mean: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          lat: parseFloat(formData.lat),
          lon: parseFloat(formData.lon),
          temperature_2m_max: parseFloat(formData.temperature_2m_max),
          temperature_2m_min: parseFloat(formData.temperature_2m_min),
          rain_sum: parseFloat(formData.rain_sum),
          snowfall_sum: parseFloat(formData.snowfall_sum),
          windspeed_10m_max: parseFloat(formData.windspeed_10m_max),
          surface_pressure_mean: parseFloat(formData.surface_pressure_mean),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `API Error: ${response.statusText}`);
      }

      const result = await response.json();
      addPrediction(result);
      setShowForm(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute bottom-6 left-6 z-[1000]">
      {!showForm ? (
        <button
          className="bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-green-800 transition-transform transform hover:scale-105"
          onClick={() => setShowForm(true)}
        >
          Predict Landslide Risk
        </button>
      ) : (
        <div className="bg-gray-800 bg-opacity-90 backdrop-blur-sm text-white p-4 rounded-lg shadow-2xl w-[360px] border border-gray-700">
          <h3 className="text-lg font-semibold text-green-400 mb-3 text-center">New Prediction</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(formData).map(([key, value]) => (
                <div key={key}>
                  <label htmlFor={key} className="text-xs text-gray-400 mb-1 block capitalize">{key.replace(/_/g, " ")}</label>
                  <input
                    id={key}
                    type={key === "date" ? "date" : "number"}
                    step="any"
                    name={key}
                    value={value}
                    onChange={handleChange}
                    className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                    required
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-red-400 text-sm text-center pt-1">{error}</p>}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Predicting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}