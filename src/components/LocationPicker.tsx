/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GOOGLE_MAPS_API_KEY, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/config/maps';
import type { Location } from '@/types';

interface LocationPickerProps {
  onSelect: (location: Location) => void;
  onClose: () => void;
  initialLocation?: Location;
}

export function LocationPicker({ onSelect, onClose, initialLocation }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location>(
    initialLocation || {
      latitude: DEFAULT_MAP_CENTER.lat,
      longitude: DEFAULT_MAP_CENTER.lng,
      address: '',
    }
  );
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  useEffect(() => {
    // Check if API key is configured
    if (!GOOGLE_MAPS_API_KEY) {
      setIsApiKeyMissing(true);
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: {
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
      },
      zoom: DEFAULT_MAP_ZOOM,
    });

    const marker = new google.maps.Marker({
      position: {
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
      },
      map,
      draggable: true,
    });

    // Update location when marker is dragged
    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) {
        setSelectedLocation({
          latitude: position.lat(),
          longitude: position.lng(),
          address: `${position.lat().toFixed(4)}, ${position.lng().toFixed(4)}`,
        });
      }
    });

    // Update location when map is clicked
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        setSelectedLocation({
          latitude: e.latLng.lat(),
          longitude: e.latLng.lng(),
          address: `${e.latLng.lat().toFixed(4)}, ${e.latLng.lng().toFixed(4)}`,
        });
      }
    });
  };

  const handleConfirm = () => {
    onSelect(selectedLocation);
  };

  if (isApiKeyMissing) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Google Maps API Key Required</DialogTitle>
            <DialogDescription>
              Please configure your Google Maps API key in <code>src/config/maps.ts</code> to use the location picker.
              <br /><br />
              See the README for setup instructions.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px]">
        <DialogHeader>
          <DialogTitle>Select Location</DialogTitle>
          <DialogDescription>
            Click on the map or drag the marker to select a location
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-[450px] rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleConfirm} className="flex-1">
            Confirm Location
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
