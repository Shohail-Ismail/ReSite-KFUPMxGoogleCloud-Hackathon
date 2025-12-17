/**
 * Google Maps Service Layer
 * 
 * This service handles Maps-related operations including:
 * - Distance Matrix API for accurate distance/ETA
 * - Haversine fallback for batch calculations
 * - Geocoding utilities
 */

import type { Location } from '@/types';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';

// Types for Distance Matrix API response
interface DistanceResult {
  distanceKm: number;
  etaMinutes: number;
}

// Cache for distance calculations to avoid redundant API calls
const distanceCache = new Map<string, DistanceResult>();

/**
 * Generate cache key for distance lookup
 */
function getCacheKey(origin: Location, destination: Location): string {
  return `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}_${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
}

/**
 * Calculate distance between two locations using Haversine formula
 * Returns distance in kilometers
 * 
 * Used as fallback when Distance Matrix API is unavailable or for batch operations
 */
export function calculateDistanceHaversine(loc1: Location, loc2: Location): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) *
    Math.cos(toRad(loc2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate ETA based on Haversine distance
 * Assumes average speed of 50 km/h for construction vehicles in urban areas
 */
function estimateETAFromDistance(distanceKm: number): number {
  const averageSpeedKmh = 50;
  return Math.round((distanceKm / averageSpeedKmh) * 60); // minutes
}

/**
 * Get distance and ETA using Google Maps Distance Matrix API
 * Falls back to Haversine calculation if API fails
 */
export async function getDistanceAndETA(
  origin: Location,
  destination: Location,
  useApi: boolean = true
): Promise<DistanceResult> {
  // Check cache first
  const cacheKey = getCacheKey(origin, destination);
  if (distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey)!;
  }
  
  // Try Distance Matrix API if enabled
  if (useApi && GOOGLE_MAPS_API_KEY) {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destStr = `${destination.latitude},${destination.longitude}`;
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?` +
        `origins=${encodeURIComponent(originStr)}&` +
        `destinations=${encodeURIComponent(destStr)}&` +
        `mode=driving&` +
        `units=metric&` +
        `key=${GOOGLE_MAPS_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (
          data.status === 'OK' &&
          data.rows?.[0]?.elements?.[0]?.status === 'OK'
        ) {
          const element = data.rows[0].elements[0];
          const result: DistanceResult = {
            distanceKm: Math.round((element.distance.value / 1000) * 10) / 10,
            etaMinutes: Math.round(element.duration.value / 60),
          };
          
          // Cache the result
          distanceCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (error) {
      console.warn('[MapsService] Distance Matrix API failed, using Haversine fallback:', error);
    }
  }
  
  // Fallback to Haversine calculation
  const distanceKm = calculateDistanceHaversine(origin, destination);
  const result: DistanceResult = {
    distanceKm,
    etaMinutes: estimateETAFromDistance(distanceKm),
  };
  
  // Cache the fallback result
  distanceCache.set(cacheKey, result);
  return result;
}

/**
 * Batch distance calculation using Haversine (no API calls)
 * Use this for matching multiple candidates to avoid expensive API calls
 */
export function getBatchDistances(
  origin: Location,
  destinations: Location[]
): DistanceResult[] {
  return destinations.map(dest => {
    const distanceKm = calculateDistanceHaversine(origin, dest);
    return {
      distanceKm,
      etaMinutes: estimateETAFromDistance(distanceKm),
    };
  });
}

/**
 * Reverse geocode: Convert lat/lng to readable address using Google Maps Geocoding API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (!GOOGLE_MAPS_API_KEY) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?` +
      `latlng=${lat},${lng}&` +
      `key=${GOOGLE_MAPS_API_KEY}`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
        return data.results[0].formatted_address;
      }
    }
  } catch (error) {
    console.warn('[MapsService] Reverse geocode failed:', error);
  }
  
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/**
 * Forward geocode: Convert address to lat/lng using Google Maps Geocoding API
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?` +
      `address=${encodeURIComponent(address)}&` +
      `key=${GOOGLE_MAPS_API_KEY}`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
        const loc = data.results[0].geometry.location;
        return {
          latitude: loc.lat,
          longitude: loc.lng,
          address: data.results[0].formatted_address || address,
        };
      }
    }
  } catch (error) {
    console.warn('[MapsService] Geocode failed:', error);
  }
  
  return null;
}

/**
 * Clear the distance cache (useful for testing or memory management)
 */
export function clearDistanceCache(): void {
  distanceCache.clear();
}
