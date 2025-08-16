import { useEffect, useState } from 'react';
import { useGeocoding } from '@/hooks/useGeocoding';

interface LazyCoordinatesProps {
  city: string | null;
  state: string | null;
  existingLat: number | null;
  existingLng: number | null;
}

export function LazyCoordinates({ city, state, existingLat, existingLng }: LazyCoordinatesProps) {
  const { geocode, loading } = useGeocoding();
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    // If we already have coordinates, use them
    if (existingLat !== null && existingLng !== null) {
      setCoordinates({ lat: existingLat, lng: existingLng });
      return;
    }

    // Only geocode if we have city and state but no coordinates
    if (city && state && !attempted && existingLat === null && existingLng === null) {
      setAttempted(true);
      geocode(city, state).then(result => {
        if (result) {
          setCoordinates(result);
        }
      });
    }
  }, [city, state, existingLat, existingLng, attempted, geocode]);

  // Show existing coordinates
  if (existingLat !== null && existingLng !== null) {
    return (
      <div className="text-xs text-muted-foreground">
        {existingLat.toFixed(4)}, {existingLng.toFixed(4)}
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="text-xs text-muted-foreground">
        Geocoding...
      </div>
    );
  }

  // Show geocoded coordinates
  if (coordinates) {
    return (
      <div className="text-xs text-muted-foreground">
        {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)} (geocoded)
      </div>
    );
  }

  // Don't show anything if no city/state or if geocoding failed
  if (!city || !state) {
    return null;
  }

  return (
    <div className="text-xs text-muted-foreground">
      Coordinates unavailable
    </div>
  );
}