/**
 * Google Maps Configuration
 * 
 * API key is imported from private/secrets (private submodule).
 * See private/README.md for setup instructions.
 */

export { GOOGLE_MAPS_API_KEY } from "@private/secrets";

export const DEFAULT_MAP_CENTER = {
  lat: 24.7136, // Riyadh, Saudi Arabia (KFUPM region)
  lng: 46.6753,
};

export const DEFAULT_MAP_ZOOM = 11;
