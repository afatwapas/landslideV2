'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import LoadingScreen from './components/LoadingScreen';
import DevConsole from './components/DevConsole';
import PredictForm from "./components/predictform"

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import('./components/MapComponent'), {
  ssr: false,
  loading: () => null, // We'll handle loading with our custom component
});

const REGION_COMMANDS = {
  northern: { command: 'NORTHERN COMMAND', subtitle: 'Jammu & Kashmir, Himachal Pradesh' },
  central: { command: 'CENTRAL COMMAND', subtitle: 'Uttarakhand, Uttar Pradesh' },
  eastern: { command: 'EASTERN COMMAND', subtitle: 'West Bengal, North East States' },
};

export default function Home() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<'satellite' | 'street' | 'tiff'>('satellite');
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(8);
  const [isRegionTransitioning, setIsRegionTransitioning] = useState(false);

  const currentCommand = selectedRegion 
    ? REGION_COMMANDS[selectedRegion as keyof typeof REGION_COMMANDS]
    : { command: 'WESTERN COMMAND', subtitle: 'Regional Landslide Analysis' };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Loading Screen */}
      {/* {isLoading && (
        <LoadingScreen 
          message="Initializing LAPS System..."
          showProgress={true}
          progress={75}
        />
      )} */}

      {/* Left Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-green-400 mb-2">LAPS</h1>
          <p className="text-gray-300 text-sm">Tactical Geospatial Intelligence</p>
        </div>

        {/* Military Commands Section */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-green-400 mb-4">MILITARY COMMANDS</h2>
          
          <div className="space-y-3">
            <RegionButton
              id="northern"
              title="Northern Region"
              subtitle="jammu & kashmir, himachal pradesh"
              isSelected={selectedRegion === 'northern'}
              onClick={() => {
                if (!isRegionTransitioning) {
                  setIsRegionTransitioning(true);
                  setSelectedRegion(selectedRegion === 'northern' ? null : 'northern');
                  setTimeout(() => setIsRegionTransitioning(false), 1600);
                }
              }}
              disabled={isRegionTransitioning}
            />
            
            <RegionButton
              id="central"
              title="Central Region"
              subtitle="uttarakhand, uttar pradesh"
              isSelected={selectedRegion === 'central'}
              onClick={() => {
                if (!isRegionTransitioning) {
                  setIsRegionTransitioning(true);
                  setSelectedRegion(selectedRegion === 'central' ? null : 'central');
                  setTimeout(() => setIsRegionTransitioning(false), 1600);
                }
              }}
              disabled={isRegionTransitioning}
            />
            
            <RegionButton
              id="eastern"
              title="Eastern Region"
              subtitle="west bengal, north east states"
              isSelected={selectedRegion === 'eastern'}
              onClick={() => {
                if (!isRegionTransitioning) {
                  setIsRegionTransitioning(true);
                  setSelectedRegion(selectedRegion === 'eastern' ? null : 'eastern');
                  setTimeout(() => setIsRegionTransitioning(false), 1600);
                }
              }}
              disabled={isRegionTransitioning}
            />
          </div>
        </div>

        {/* Boundary Legend */}
        <div className="p-6 mt-auto">
          <h3 className="text-lg font-semibold text-green-400 mb-4">BOUNDARY LEGEND</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-orange-500 mr-3"></div>
              <span className="text-sm text-gray-300">India Border</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-blue-500 mr-3"></div>
              <span className="text-sm text-gray-300">State Boundaries</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-yellow-500 mr-3"></div>
              <span className="text-sm text-gray-300">District Boundaries</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-green-400">{currentCommand.command}</h2>
              <p className="text-gray-300">{currentCommand.subtitle}</p>
            </div>
            
            {/* Map Layer Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 mr-2">Map Layer:</span>
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button 
                  onClick={() => setMapLayer('satellite')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    mapLayer === 'satellite'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Satellite
                </button>
                <button 
                  onClick={() => setMapLayer('street')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    mapLayer === 'street'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Street
                </button>
                <button 
                  onClick={() => setMapLayer('tiff')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    mapLayer === 'tiff'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  TIFF Overlay
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapComponent 
            selectedRegion={selectedRegion} 
            mapLayer={mapLayer}
            isOffline={isOffline}
            currentZoom={currentZoom}
            onZoomChange={setCurrentZoom}
            onLoadingChange={setIsLoading}
          />
          {/* 🧠 Prediction Form Floating on Top */}
          <PredictForm />

        </div>
      </div>

      {/* Dev Console */}
      <DevConsole 
        isOffline={isOffline}
        onOfflineModeChange={setIsOffline}
        currentZoom={currentZoom}
        onZoomChange={setCurrentZoom}
      />
    </div>
  );
}

interface RegionButtonProps {
  id: string;
  title: string;
  subtitle: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function RegionButton({ id, title, subtitle, isSelected, onClick, disabled = false }: RegionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 border rounded-lg text-left transition-all duration-200 ${
        isSelected
          ? 'border-green-500 bg-green-500/10 shadow-lg'
          : disabled
          ? 'border-gray-700 bg-gray-800/50 cursor-not-allowed opacity-50'
          : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
      } ${disabled ? 'pointer-events-none' : ''}`}
    >
      <div className="font-semibold text-white">{title}</div>
      <div className="text-sm text-gray-400">{subtitle}</div>
    </button>
  );
}