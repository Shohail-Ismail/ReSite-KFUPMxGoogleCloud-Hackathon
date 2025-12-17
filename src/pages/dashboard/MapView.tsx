/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from 'react';
import { getAllActiveListings, getAllOpenRequests, getUser, getOrganisation } from '@/services/firestoreService';
import { logContactClicked } from '@/services/analyticsService';
import { useAuth } from '@/contexts/AuthContext';
import type { Listing, Request, MaterialType, ConditionType, UrgencyLevel, User, Organisation } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { GOOGLE_MAPS_API_KEY, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/config/maps';
import { toast } from 'sonner';
import { MapPin, Package, ShoppingCart, Info, Star, Shield, Clock, Mail, Phone } from 'lucide-react';

// User-friendly labels
const MATERIAL_LABELS: Record<MaterialType, string> = {
  steel_beam: 'Steel Beams',
  rebar: 'Reinforcement Bars',
  concrete: 'Concrete',
  aggregates: 'Aggregates',
  timber: 'Timber',
};

const CONDITION_LABELS: Record<ConditionType, string> = {
  unused: 'Brand New',
  slightly_used: 'Like New',
  used: 'Used - Good Condition',
};

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: 'Flexible Timeline',
  medium: 'Standard Delivery',
  high: 'Urgent Need',
};

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

type ViewMode = 'listings' | 'requests';

interface EnrichedListing extends Listing {
  creatorUser?: User;
  creatorOrg?: Organisation;
}

interface EnrichedRequest extends Request {
  creatorUser?: User;
  creatorOrg?: Organisation;
}

export default function MapView() {
  const { currentUser } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  
  const [listings, setListings] = useState<EnrichedListing[]>([]);
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('listings');
  const [loading, setLoading] = useState(true);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && !isApiKeyMissing) {
      if (!mapLoaded) {
        initMap();
      } else {
        updateMarkers();
      }
    }
  }, [loading, viewMode, mapLoaded]);

  // Make contact handlers globally available for info window buttons
  useEffect(() => {
    (window as any).handleContactEmail = (email: string, userId: string, context: string, contextId: string) => {
      if (currentUser) {
        logContactClicked(currentUser.uid, userId, context as 'listing' | 'request', contextId);
      }
      window.location.href = `mailto:${email}`;
      toast.success('Opening email client...');
    };
    
    (window as any).handleContactPhone = (phone: string, userId: string, context: string, contextId: string) => {
      if (currentUser) {
        logContactClicked(currentUser.uid, userId, context as 'listing' | 'request', contextId);
      }
      window.location.href = `tel:${phone}`;
      toast.success('Opening phone dialer...');
    };

    return () => {
      delete (window as any).handleContactEmail;
      delete (window as any).handleContactPhone;
    };
  }, [currentUser]);

  const loadData = async () => {
    try {
      const [listingsData, requestsData] = await Promise.all([
        getAllActiveListings(),
        getAllOpenRequests(),
      ]);

      // Enrich listings with user and org data
      const enrichedListings = await Promise.all(
        listingsData.map(async (listing) => {
          const [creatorUser, creatorOrg] = await Promise.all([
            getUser(listing.createdByUserId).catch(() => null),
            getOrganisation(listing.organisationId).catch(() => null),
          ]);
          return {
            ...listing,
            creatorUser: creatorUser || undefined,
            creatorOrg: creatorOrg || undefined,
          };
        })
      );

      // Enrich requests with user and org data
      const enrichedRequests = await Promise.all(
        requestsData.map(async (request) => {
          const [creatorUser, creatorOrg] = await Promise.all([
            getUser(request.createdByUserId).catch(() => null),
            getOrganisation(request.organisationId).catch(() => null),
          ]);
          return {
            ...request,
            creatorUser: creatorUser || undefined,
            creatorOrg: creatorOrg || undefined,
          };
        })
      );

      setListings(enrichedListings);
      setRequests(enrichedRequests);
    } catch (error) {
      toast.error('Failed to load map data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTrustBadge = (user?: User) => {
    if (!user) return '';
    
    const trustScore = user.trustScore || 0;
    const totalRatings = user.totalRatings || 0;
    const verified = user.verifiedSeller || user.verifiedBuyer;
    
    let trustLevel = 'New Member';
    let trustColor = '#9ca3af';
    
    if (totalRatings >= 10 && trustScore >= 4.5) {
      trustLevel = 'Excellent';
      trustColor = '#22c55e';
    } else if (totalRatings >= 5 && trustScore >= 4) {
      trustLevel = 'Trusted';
      trustColor = '#3b82f6';
    } else if (totalRatings >= 2 && trustScore >= 3) {
      trustLevel = 'Verified';
      trustColor = '#8b5cf6';
    } else if (totalRatings > 0) {
      trustLevel = 'Active';
      trustColor = '#f59e0b';
    }

    return `
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
        ${verified ? `
          <div style="display: flex; align-items: center; gap: 4px; padding: 2px 8px; background: #dcfce7; border-radius: 12px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#16a34a" stroke="#16a34a" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4" fill="none" stroke="white"/>
            </svg>
            <span style="font-size: 11px; color: #16a34a; font-weight: 600;">Verified</span>
          </div>
        ` : ''}
        <div style="display: flex; align-items: center; gap: 4px; padding: 2px 8px; background: ${trustColor}20; border-radius: 12px;">
          ${totalRatings > 0 ? `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="${trustColor}" stroke="${trustColor}">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span style="font-size: 11px; color: ${trustColor}; font-weight: 600;">${trustScore.toFixed(1)}</span>
            <span style="font-size: 10px; color: #6b7280;">(${totalRatings})</span>
          ` : `
            <span style="font-size: 11px; color: ${trustColor}; font-weight: 500;">${trustLevel}</span>
          `}
        </div>
        ${user.responseRate ? `
          <div style="display: flex; align-items: center; gap: 4px; padding: 2px 8px; background: #f3f4f6; border-radius: 12px;">
            <span style="font-size: 10px; color: #6b7280;">⚡ ${user.responseRate}% response</span>
          </div>
        ` : ''}
      </div>
    `;
  };

  const getContactButtons = (user?: User, context: 'listing' | 'request' = 'listing', contextId: string = '') => {
    if (!user) {
      return `
        <div style="padding: 8px; background: #fef3c7; border-radius: 8px; text-align: center;">
          <p style="font-size: 12px; color: #92400e;">Contact information not available</p>
        </div>
      `;
    }

    const email = user.email;
    const phone = user.phone;
    const userId = user.id;

    return `
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        ${email ? `
          <button onclick="window.handleContactEmail('${email}', '${userId}', '${context}', '${contextId}')" 
            style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 16px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            Email
          </button>
        ` : ''}
        ${phone ? `
          <button onclick="window.handleContactPhone('${phone}', '${userId}', '${context}', '${contextId}')" 
            style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 16px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Call
          </button>
        ` : ''}
      </div>
      ${!email && !phone ? `
        <div style="padding: 8px; background: #fef3c7; border-radius: 8px; text-align: center; margin-top: 12px;">
          <p style="font-size: 12px; color: #92400e;">No contact details provided</p>
        </div>
      ` : ''}
    `;
  };

  const createListingInfoContent = (listing: EnrichedListing) => `
    <div style="padding: 16px; max-width: 340px; font-family: system-ui, -apple-system, sans-serif;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 8px; border-radius: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #22c55e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Available Material</div>
          <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${listing.title}</div>
        </div>
      </div>

      <!-- Seller Profile -->
      <div style="background: #f9fafb; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #e5e7eb, #d1d5db); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 16px; font-weight: 600; color: #6b7280;">${(listing.creatorUser?.displayName || 'U')[0].toUpperCase()}</span>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 600; color: #374151;">${listing.creatorUser?.displayName || 'Unknown Seller'}</div>
            <div style="font-size: 12px; color: #6b7280;">${listing.creatorOrg?.name || 'Independent'}</div>
          </div>
        </div>
        ${getTrustBadge(listing.creatorUser)}
      </div>
      
      <div style="background: #f0fdf4; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Material Type</div>
            <div style="font-size: 13px; font-weight: 600; color: #374151;">${MATERIAL_LABELS[listing.materialType]}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Condition</div>
            <div style="font-size: 13px; font-weight: 600; color: #374151;">${CONDITION_LABELS[listing.condition]}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Quantity</div>
            <div style="font-size: 13px; font-weight: 600; color: #374151;">${listing.quantityValue} ${listing.quantityUnit}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Listed</div>
            <div style="font-size: 13px; font-weight: 600; color: #374151;">${formatDate(listing.createdAt)}</div>
          </div>
        </div>
      </div>
      
      ${listing.description ? `
        <div style="font-size: 13px; color: #4b5563; margin-bottom: 12px; line-height: 1.5;">
          ${listing.description.length > 120 ? listing.description.substring(0, 120) + '...' : listing.description}
        </div>
      ` : ''}
      
      <div style="display: flex; align-items: center; gap: 6px; color: #6b7280; font-size: 12px; margin-bottom: 4px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        ${listing.location.address}
      </div>

      <!-- Contact Buttons -->
      ${getContactButtons(listing.creatorUser, 'listing', listing.id)}
    </div>
  `;

  const createRequestInfoContent = (request: EnrichedRequest) => `
    <div style="padding: 16px; max-width: 340px; font-family: system-ui, -apple-system, sans-serif;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 8px; border-radius: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #3b82f6; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Material Needed</div>
          <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${request.title}</div>
        </div>
      </div>

      <!-- Buyer Profile -->
      <div style="background: #f9fafb; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #e5e7eb, #d1d5db); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 16px; font-weight: 600; color: #6b7280;">${(request.creatorUser?.displayName || 'U')[0].toUpperCase()}</span>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 600; color: #374151;">${request.creatorUser?.displayName || 'Unknown Buyer'}</div>
            <div style="font-size: 12px; color: #6b7280;">${request.creatorOrg?.name || 'Independent'}</div>
          </div>
        </div>
        ${getTrustBadge(request.creatorUser)}
      </div>
      
      <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px; background: ${URGENCY_COLORS[request.urgency]}20; color: ${URGENCY_COLORS[request.urgency]};">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: ${URGENCY_COLORS[request.urgency]};"></span>
        ${URGENCY_LABELS[request.urgency]}
      </div>
      
      <div style="background: #eff6ff; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Material Type</div>
            <div style="font-size: 13px; font-weight: 600; color: #374151;">${MATERIAL_LABELS[request.materialType]}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Quantity Needed</div>
            <div style="font-size: 13px; font-weight: 600; color: #374151;">${request.quantityValue} ${request.quantityUnit}</div>
          </div>
        </div>
      </div>
      
      ${request.description ? `
        <div style="font-size: 13px; color: #4b5563; margin-bottom: 12px; line-height: 1.5;">
          ${request.description.length > 120 ? request.description.substring(0, 120) + '...' : request.description}
        </div>
      ` : ''}
      
      <div style="display: flex; align-items: center; gap: 6px; color: #6b7280; font-size: 12px; margin-bottom: 4px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        ${request.location.address}
      </div>

      <!-- Contact Buttons -->
      ${getContactButtons(request.creatorUser, 'request', request.id)}
    </div>
  `;

  const updateMarkers = () => {
    if (!mapInstanceRef.current) return;
    
    clearMarkers();
    
    const items = viewMode === 'listings' ? listings : requests;
    const bounds = new google.maps.LatLngBounds();
    
    items.forEach((item) => {
      const isListing = viewMode === 'listings';
      const position = {
        lat: item.location.latitude,
        lng: item.location.longitude,
      };
      
      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        icon: {
          url: isListing
            ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
            : 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        },
        title: item.title,
        animation: google.maps.Animation.DROP,
      });

      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
        
        const content = isListing 
          ? createListingInfoContent(item as EnrichedListing)
          : createRequestInfoContent(item as EnrichedRequest);
        
        infoWindowRef.current = new google.maps.InfoWindow({ content });
        infoWindowRef.current.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (items.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);
      const zoom = mapInstanceRef.current.getZoom();
      if (zoom && zoom > 15) {
        mapInstanceRef.current.setZoom(15);
      }
    }
  };

  const initMap = () => {
    if (!mapRef.current) return;

    if (!GOOGLE_MAPS_API_KEY) {
      setIsApiKeyMissing(true);
      return;
    }

    // Check if script already loaded
    if (window.google?.maps) {
      createMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&loading=async`;
    script.async = true;
    script.onload = createMap;
    script.onerror = () => {
      console.error('[MapView] Failed to load Google Maps script - check API key domain restrictions');
      setIsApiKeyMissing(true);
    };
    document.head.appendChild(script);
  };

  const createMap = () => {
    if (!mapRef.current) return;
    
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    
    setMapLoaded(true);
    updateMarkers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (isApiKeyMissing) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Google Maps API Key Required</p>
          <p className="text-muted-foreground">
            Please configure your Google Maps API key in <code className="bg-muted px-2 py-1 rounded text-sm">src/config/maps.ts</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with explanation */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Explore the Marketplace</h1>
        <p className="text-muted-foreground max-w-2xl">
          Discover available construction materials and active requests from companies across the region. 
          Click on any marker to view details, check seller/buyer trustworthiness, and contact them directly.
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{listings.length} Materials Available</p>
              <p className="text-sm text-muted-foreground">Surplus materials from other companies</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{requests.length} Active Requests</p>
              <p className="text-sm text-muted-foreground">Companies looking for materials</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Verified Profiles</p>
              <p className="text-sm text-muted-foreground">Trust scores & ratings shown</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Central toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Viewing {viewMode === 'listings' ? 'available materials from sellers' : 'material requests from buyers'}</span>
            </div>
            
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full sm:w-auto">
              <TabsList className="grid w-full sm:w-auto grid-cols-2 h-11">
                <TabsTrigger value="listings" className="gap-2 px-6">
                  <Package className="w-4 h-4" />
                  <span>Sellers</span>
                  <Badge variant="secondary" className="ml-1 bg-green-500/20 text-green-700 dark:text-green-300">
                    {listings.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="requests" className="gap-2 px-6">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Buyers</span>
                  <Badge variant="secondary" className="ml-1 bg-blue-500/20 text-blue-700 dark:text-blue-300">
                    {requests.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div ref={mapRef} className="w-full h-[600px]" />
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Sellers (Materials Available)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Buyers (Materials Needed)</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-600" />
          <span>Verified User</span>
        </div>
      </div>
    </div>
  );
}
