'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import SimpleTileLayer from './SimpleTileLayer';
import { loadRegionData, findNearestLocation, LocationData } from '../utils/dataUtils';
import { loadAllBoundaries, BoundaryData } from '../utils/boundaryUtils';
import DataOverlay from './DataOverlay';
import MarkerLoadingOverlay from './MarkerLoadingOverlay';
import { usePrediction } from '../context/PredictionContext';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createRiskIcon = (color: string) => {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="w-8 h-8">
      <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 005.16-4.212c1.558-2.226 2.34-4.88 2.34-7.585 0-5.842-4.736-10.582-10.582-10.582S1.58 4.67 1.58 10.512c0 2.704.782 5.36 2.34 7.585a16.975 16.975 0 005.16 4.212zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
    </svg>`,
    className: 'bg-transparent border-0',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const highRiskIcon = createRiskIcon('#ef4444'); // Red
const lowRiskIcon = createRiskIcon('#22c55e'); // Green

interface RegionBounds {
  north: number;
  south: number;
  west: number;
  east: number;
}

const REGIONS: Record<string, RegionBounds> = {
  northern: { north: 37.8, south: 31.5, west: 71.5, east: 81.0 },
  central: { north: 32.0, south: 27.5, west: 76.0, east: 82.0 },
  eastern: { north: 30.0, south: 20.5, west: 86.5, east: 98.5 },
};

interface MapComponentProps {
  selectedRegion: string | null;
  mapLayer: 'satellite' | 'street' | 'tiff';
  isOffline: boolean;
  onZoomChange?: (zoom: number) => void;
  currentZoom?: number;
  onLoadingChange: (loading: boolean) => void;
}

interface MarkerData {
  lat: number;
  lng: number;
  data: LocationData | null;
}

export default function MapComponent({ 
  selectedRegion, 
  mapLayer, 
  isOffline, 
  onZoomChange,
  currentZoom = 8,
  onLoadingChange 
}: MapComponentProps) {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [showDataOverlay, setShowDataOverlay] = useState(false);
  const [regionData, setRegionData] = useState<LocationData[]>([]);
  const [boundaries, setBoundaries] = useState<{
    country: BoundaryData | null;
    states: BoundaryData | null;
    districts: BoundaryData | null;
  }>({ country: null, states: null, districts: null });
  const [isMarkerLoading, setIsMarkerLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const { predictionResults, panToLocation } = usePrediction();
  console.log('Prediction Results:', predictionResults);

  useEffect(() => {
    const initializeBoundaries = async () => {
      onLoadingChange(true);
      try {
        const boundaryData = await loadAllBoundaries(isOffline);
        setBoundaries(boundaryData);
        setMapReady(true);
      } catch (error) {
        console.error('Error initializing map data:', error);
      } finally {
        onLoadingChange(false);
      }
    };
    initializeBoundaries();
  }, [onLoadingChange, isOffline]);

  useEffect(() => {
    const loadRegionSpecificData = async () => {
      if (!selectedRegion) {
        setRegionData([]);
        return;
      }
      onLoadingChange(true);
      try {
        const data = await loadRegionData(selectedRegion);
        setRegionData(data);
      } catch (error) {
        console.error(`Error loading ${selectedRegion} data:`, error);
        setRegionData([]);
      } finally {
        onLoadingChange(false);
      }
    };
    loadRegionSpecificData();
  }, [selectedRegion, onLoadingChange]);

  const handleMapClick = async (lat: number, lng: number) => {
    setIsMarkerLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const nearestData = findNearestLocation(regionData, lat, lng);
      const newMarker: MarkerData = { lat, lng, data: nearestData };
      setMarkers(prev => [...prev, newMarker]);
      setSelectedMarker(newMarker);
      setShowDataOverlay(true);
    } catch (error) {
      console.error('Error processing marker click:', error);
    } finally {
      setIsMarkerLoading(false);
    }
  };

  if (!mapReady) {
    return null;
  }

  return (
    <div className="relative h-full">
      <MapContainer
        center={[28.6139, 77.2090]}
        zoom={currentZoom}
        className="h-full w-full"
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
      >
        <MapController 
          selectedRegion={selectedRegion} 
          onMapClick={handleMapClick}
          onMapReady={setMapInstance}
          onZoomChange={onZoomChange}
          panToLocation={panToLocation}
        />
        
        <SimpleTileLayer type={mapLayer} isOffline={isOffline} />
        
        {mapLayer === 'tiff' && (
          <SimpleTileLayer type="satellite" opacity={0.7} isOffline={isOffline} />
        )}

        <BoundaryLayers boundaries={boundaries} />

        {predictionResults.map((result, index) => (
          <Marker
            key={`prediction-${index}`}
            position={[result.closest_db_lat, result.closest_db_lon]}
            icon={result.prediction === 0 ? lowRiskIcon : highRiskIcon}
          >
            <Popup>
              <div className="text-sm font-sans">
                <p className="font-bold text-base mb-1">
                  Prediction: <span style={{ color: result.prediction === 0 ? '#22c55e' : '#ef4444' }}>
                    {result.prediction === 0 ? 'Low Risk' : 'High Risk'}
                  </span>
                </p>
                <p><strong>Location:</strong> {result.closest_db_lat.toFixed(4)}, {result.closest_db_lon.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={[marker.lat, marker.lng]}
            eventHandlers={{
              click: () => {
                setSelectedMarker(marker);
                setShowDataOverlay(true);
              },
            }}
          >
            <Popup>
              <div className="text-sm">
                <p><strong>Coordinates:</strong> {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}</p>
                {marker.data && (
                  <p><strong>Nearest Data Point:</strong> {marker.data.location}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <MarkerLoadingOverlay isVisible={isMarkerLoading} />

      {showDataOverlay && selectedMarker && (
        <DataOverlay
          marker={selectedMarker}
          onClose={() => setShowDataOverlay(false)}
        />
      )}
    </div>
  );
}

interface MapControllerProps {
  selectedRegion: string | null;
  onMapClick: (lat: number, lng: number) => void;
  onMapReady?: (map: L.Map) => void;
  onZoomChange?: (zoom: number) => void;
  panToLocation: [number, number] | null;
}

function MapController({ selectedRegion, onMapClick, onMapReady, onZoomChange, panToLocation }: MapControllerProps) {
  const map = useMap();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  useEffect(() => {
    if (panToLocation) {
      map.flyTo(panToLocation, 12, { animate: true, duration: 1.5 });
    }
  }, [panToLocation, map]);

  useEffect(() => {
    if (selectedRegion && REGIONS[selectedRegion]) {
      setIsTransitioning(true);
      const region = REGIONS[selectedRegion];
      const bounds = L.latLngBounds([region.south, region.west], [region.north, region.east]);
      map.setMaxBounds(bounds);
      map.flyToBounds(bounds, { padding: [30, 30], duration: 1.5, maxZoom: 11 });
      setTimeout(() => {
        map.setMaxBounds(bounds.pad(0.25));
        setIsTransitioning(false);
      }, 1600);
    } else {
      setIsTransitioning(true);
      // map.setMaxBounds();
      map.flyTo([28.6139, 77.2090], 6, { duration: 1.5 });
      setTimeout(() => setIsTransitioning(false), 1600);
    }
  }, [selectedRegion, map]);

  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      if (!isTransitioning) onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [map, onMapClick, isTransitioning]);

  useEffect(() => {
    const handleZoomEnd = () => { if (onZoomChange) onZoomChange(map.getZoom()); };
    map.on('zoomend', handleZoomEnd);
    return () => { map.off('zoomend', handleZoomEnd); };
  }, [map, onZoomChange]);

  return null;
}

interface BoundaryLayersProps {
  boundaries: {
    country: BoundaryData | null;
    states: BoundaryData | null;
    districts: BoundaryData | null;
  };
}

function BoundaryLayers({ boundaries }: BoundaryLayersProps) {
  return (
    <>
      {boundaries.country && <GeoJSON data={boundaries.country} style={{ color: '#f97316', weight: 4, fillOpacity: 0, opacity: 1, dashArray: '5, 5' }} />}
      {boundaries.states && <GeoJSON data={boundaries.states} style={{ color: '#3b82f6', weight: 3, fillOpacity: 0, opacity: 0.9 }} />}
      {boundaries.districts && <GeoJSON data={boundaries.districts} style={{ color: '#eab308', weight: 2, fillOpacity: 0, opacity: 0.7 }} />}
    </>
  );
}
