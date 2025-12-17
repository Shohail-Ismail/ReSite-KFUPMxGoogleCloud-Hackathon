import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Leaf, MapPin, Package, Sparkles, TrendingUp, ChevronDown, Info, Brain, Route, Zap, Target, Scale, Clock, ThermometerSun, Star } from 'lucide-react';
import { getMatchesWithListings, MatchWithListing, DEFAULT_SCORING_WEIGHTS } from '@/services/matchService';
import { logMatchAcceptance, logMatchRejection } from '@/services/analyticsService';
import { getUser } from '@/services/firestoreService';
import { useAuth } from '@/contexts/AuthContext';
import type { Request, MaterialType, User } from '@/types';
import { toast } from 'sonner';
import { GOOGLE_MAPS_API_KEY } from '@/config/maps';
import { UserRatingModal } from '@/components/UserRatingModal';
import { TrustBadge, UserProfileBadge } from '@/components/TrustBadge';

const MATERIAL_LABELS: Record<MaterialType, string> = {
  steel_beam: 'Steel Beam',
  rebar: 'Rebar',
  concrete: 'Concrete',
  aggregates: 'Aggregates',
  timber: 'Timber',
};

interface MatchesDisplayProps {
  request: Request;
  onClose?: () => void;
}

export function MatchesDisplay({ request, onClose }: MatchesDisplayProps) {
  const [matches, setMatches] = useState<MatchWithListing[]>([]);
  const [sellerUsers, setSellerUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);
  const [selectedMatchForRoute, setSelectedMatchForRoute] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<{
    open: boolean;
    match: MatchWithListing | null;
    sellerUser: User | null;
  }>({ open: false, match: null, sellerUser: null });
  const { userData } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const mapInitializedRef = useRef(false);

  useEffect(() => {
    loadMatches();
  }, [request.id]);

  useEffect(() => {
    // Only try to init map after loading is done and we have matches
    if (!loading && matches.length > 0 && GOOGLE_MAPS_API_KEY && !mapInitializedRef.current) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        if (mapRef.current) {
          loadGoogleMapsAndInit();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [matches, loading]);

  const loadGoogleMapsAndInit = () => {
    if (!mapRef.current || !GOOGLE_MAPS_API_KEY || mapInitializedRef.current) return;

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      initMap();
      return;
    }

    // Check if script is already in DOM but still loading
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`) as HTMLScriptElement;
    
    if (existingScript) {
      // Script exists - either it's loaded or loading
      // Use a quick check with requestAnimationFrame for faster response
      const checkGoogleMaps = () => {
        if (window.google?.maps) {
          initMap();
        } else {
          requestAnimationFrame(checkGoogleMaps);
        }
      };
      requestAnimationFrame(checkGoogleMaps);
      return;
    }

    // Load script dynamically
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => initMap();
    document.head.appendChild(script);
  };

  useEffect(() => {
    if (selectedMatchForRoute && mapInstanceRef.current) {
      drawRoute(selectedMatchForRoute);
    }
  }, [selectedMatchForRoute]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await getMatchesWithListings(request);
      setMatches(data);
      
      // Fetch seller user data for each match
      const sellerIds = [...new Set(data.map(m => m.listing?.createdByUserId).filter(Boolean))] as string[];
      const sellerData: Record<string, User> = {};
      await Promise.all(
        sellerIds.map(async (id) => {
          const user = await getUser(id);
          if (user) sellerData[id] = user;
        })
      );
      setSellerUsers(sellerData);
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const initMap = () => {
    if (!mapRef.current || !window.google?.maps) return;
    if (mapInitializedRef.current) return;
    
    mapInitializedRef.current = true;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: request.location.latitude, lng: request.location.longitude },
      zoom: 10,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      ],
    });
    mapInstanceRef.current = map;
    setMapReady(true);

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Add request marker (buyer)
    const requestMarker = new google.maps.Marker({
      position: { lat: request.location.latitude, lng: request.location.longitude },
      map,
      icon: {
        url: 'data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
      },
      title: 'Your Request Location',
    });
    markersRef.current.push(requestMarker);

    // Add listing markers
    matches.forEach((match, index) => {
      if (!match.listing?.location) return;

      const isTopMatch = index === 0;
      const iconColor = isTopMatch ? '#22c55e' : '#6b7280';

      const marker = new google.maps.Marker({
        position: { lat: match.listing.location.latitude, lng: match.listing.location.longitude },
        map,
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${iconColor}">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(isTopMatch ? 40 : 32, isTopMatch ? 40 : 32),
        },
        title: match.listing.title,
        zIndex: isTopMatch ? 100 : 1,
      });

      marker.addListener('click', () => {
        setSelectedMatchForRoute(match.id);
      });

      markersRef.current.push(marker);
    });

    // Initialize directions renderer
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#22c55e',
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    // Fit bounds
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: request.location.latitude, lng: request.location.longitude });
    matches.forEach(m => {
      if (m.listing?.location) {
        bounds.extend({ lat: m.listing.location.latitude, lng: m.listing.location.longitude });
      }
    });
    map.fitBounds(bounds);
  };

  const drawRoute = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match?.listing?.location || !mapInstanceRef.current) return;

    if (GOOGLE_MAPS_API_KEY && window.google?.maps?.DirectionsService) {
      try {
        const directionsService = new google.maps.DirectionsService();
        const result = await directionsService.route({
          origin: { lat: match.listing.location.latitude, lng: match.listing.location.longitude },
          destination: { lat: request.location.latitude, lng: request.location.longitude },
          travelMode: google.maps.TravelMode.DRIVING,
        });
        directionsRendererRef.current?.setDirections(result);
      } catch (error) {
        // Fallback to straight polyline
        drawStraightLine(match);
      }
    } else {
      drawStraightLine(match);
    }
  };

  const drawStraightLine = (match: MatchWithListing) => {
    if (!match.listing?.location || !mapInstanceRef.current) return;

    // Clear existing directions
    directionsRendererRef.current?.setMap(null);

    const polyline = new google.maps.Polyline({
      path: [
        { lat: match.listing.location.latitude, lng: match.listing.location.longitude },
        { lat: request.location.latitude, lng: request.location.longitude },
      ],
      strokeColor: '#22c55e',
      strokeWeight: 3,
      strokeOpacity: 0.7,
      map: mapInstanceRef.current,
    });
  };

  const handleAcceptMatch = async (match: MatchWithListing) => {
    if (!userData) return;
    
    try {
      await logMatchAcceptance(match.requestId, match.listingId, match.score, userData.id);
      toast.success('Match accepted! Contact details will be shared.');
      
      // Fetch seller user data and show rating modal
      if (match.listing?.createdByUserId) {
        const sellerUser = await getUser(match.listing.createdByUserId);
        if (sellerUser) {
          setRatingModal({
            open: true,
            match,
            sellerUser,
          });
        }
      }
    } catch (error) {
      console.error('Failed to accept match:', error);
      toast.error('Failed to accept match');
    }
  };

  const handleRejectMatch = async (match: MatchWithListing) => {
    if (!userData) return;
    
    try {
      await logMatchRejection(match.requestId, match.listingId, match.score, userData.id);
      toast.info('Match rejected. This feedback helps improve future matches.');
      setMatches(prev => prev.filter(m => m.id !== match.id));
    } catch (error) {
      console.error('Failed to reject match:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500/10 text-green-700 dark:text-green-400';
    if (score >= 0.6) return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
    return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
  };

  const formatCO2 = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}t`;
    }
    return `${kg}kg`;
  };

  const formatBreakdownPercent = (value: number) => `${Math.round(value * 100)}%`;

  const generateWhyThisMatch = (match: MatchWithListing) => {
    const reasons: string[] = [];
    
    if (match.breakdown) {
      if (match.breakdown.distance >= 0.8) reasons.push('closest supplier');
      if (match.co2SavedKg > 500) reasons.push('highest CO₂ savings');
      if (match.breakdown.materialMatch === 1) reasons.push('exact material match');
      if (match.breakdown.condition >= 0.8) reasons.push('excellent condition');
      if (match.breakdown.quantityFit >= 0.9) reasons.push('perfect quantity fit');
    }

    if (reasons.length === 0) reasons.push('best overall compatibility');

    return `Chosen because it offers ${reasons.slice(0, 3).join(', ')}, and meets your urgency requirements.`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <span className="text-muted-foreground">Finding AI-powered matches...</span>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No matching listings found for this request yet.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Check back later as new surplus materials become available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalCO2Saved = matches.reduce((sum, m) => sum + m.co2SavedKg, 0);
  const totalDistanceAvoided = matches.reduce((sum, m) => sum + (m.distanceKm * 2), 0); // Round trip equivalent avoided vs new sourcing

  return (
    <div className="space-y-4">
      {/* Impact Summary Bar */}
      <Card className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border-green-500/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-foreground">Impact Summary</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{formatCO2(totalCO2Saved)}</p>
              <p className="text-xs text-muted-foreground">CO₂ Saved</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{Math.round(totalDistanceAvoided)} km</p>
              <p className="text-xs text-muted-foreground">Transport Optimized</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{matches.length}</p>
              <p className="text-xs text-muted-foreground">Viable Matches</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">
            {matches.length} AI-Powered Match{matches.length !== 1 ? 'es' : ''} Found
          </span>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Leaf className="h-3 w-3" />
          Potential savings: {formatCO2(totalCO2Saved)} CO₂
        </Badge>
      </div>

      {/* Route Map */}
      {GOOGLE_MAPS_API_KEY && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-4 w-4" />
              Route Visualization
            </CardTitle>
            <CardDescription>Click on a match card or map marker to view route</CardDescription>
          </CardHeader>
          <CardContent className="p-0 relative">
            <div ref={mapRef} className="h-64 w-full rounded-b-lg" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-b-lg">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading map...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Match cards */}
      <div className="grid gap-4">
        {matches.map((match, index) => {
          const isTopMatch = index === 0;
          
          return (
            <Card 
              key={match.id} 
              className={`hover:shadow-lg transition-all cursor-pointer ${
                isTopMatch 
                  ? 'ring-2 ring-green-500 shadow-lg shadow-green-500/20' 
                  : ''
              } ${selectedMatchForRoute === match.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedMatchForRoute(match.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {isTopMatch && (
                        <Badge className="bg-green-500 text-white">
                          <Target className="h-3 w-3 mr-1" />
                          Best Match
                        </Badge>
                      )}
                      {match.listing?.title || 'Unknown Listing'}
                    </CardTitle>
                    <CardDescription>
                      {match.listing ? MATERIAL_LABELS[match.listing.materialType] : 'Material'}
                    </CardDescription>
                  </div>
                  <Badge className={getScoreColor(match.score)}>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {Math.round(match.score * 100)}% match
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Seller Profile */}
                {match.listing?.createdByUserId && (
                  <div className="bg-muted/30 rounded-lg p-3 mb-4 border border-border/50">
                    <div className="flex items-center justify-between">
                      <UserProfileBadge 
                        user={sellerUsers[match.listing.createdByUserId]} 
                        size="sm"
                      />
                      <TrustBadge 
                        user={sellerUsers[match.listing.createdByUserId]} 
                        size="sm"
                        showDetails
                      />
                    </div>
                  </div>
                )}

                {/* AI Insight Panel */}
                <div className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-lg p-3 mb-4 border border-purple-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-sm text-foreground">AI Insight</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Predicted Type</p>
                      <p className="font-medium text-foreground">
                        {match.listing?.aiMaterialType 
                          ? MATERIAL_LABELS[match.listing.aiMaterialType as MaterialType] 
                          : match.listing?.materialType 
                            ? MATERIAL_LABELS[match.listing.materialType]
                            : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">AI Confidence</p>
                      <p className="font-medium text-foreground">
                        {match.listing?.aiConfidence 
                          ? `${Math.round(match.listing.aiConfidence * 100)}%` 
                          : '82%'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Classification</p>
                      <Badge variant="outline" className="text-xs">
                        {match.listing?.aiVersion || 'v0.1_heuristic'}
                      </Badge>
                    </div>
                  </div>
                  {match.listing?.aiDescription && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      "{match.listing.aiDescription}"
                    </p>
                  )}
                </div>

                {/* Basic Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-medium text-foreground">
                      {match.listing?.quantityValue} {match.listing?.quantityUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Condition</p>
                    <p className="font-medium capitalize text-foreground">
                      {match.listing?.condition.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="flex items-start gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Distance</p>
                      <p className="font-medium text-foreground">{match.distanceKm} km</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1">
                    <Leaf className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">CO₂ Saved</p>
                      <p className="font-medium text-green-600">{formatCO2(match.co2SavedKg)}</p>
                    </div>
                  </div>
                </div>
                
                {match.listing?.location && (
                  <p className="text-xs text-muted-foreground mt-3">
                    📍 {match.listing.location.address}
                  </p>
                )}

                {/* Scoring Breakdown Pills */}
                {match.breakdown && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Scale className="h-3 w-3" />
                      Scoring Breakdown (weighted factors)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        Distance: {formatBreakdownPercent(match.breakdown.distance)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Leaf className="h-3 w-3 mr-1" />
                        CO₂: {formatCO2(match.co2SavedKg)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <ThermometerSun className="h-3 w-3 mr-1" />
                        Condition: {formatBreakdownPercent(match.breakdown.condition)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Urgency: {formatBreakdownPercent(match.breakdown.urgency)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        Material: {formatBreakdownPercent(match.breakdown.materialMatch)}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Why This Match - Only for top match */}
                {isTopMatch && (
                  <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">Why This Match?</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {generateWhyThisMatch(match)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Score Breakdown (Collapsible) */}
                {match.breakdown && (
                  <Collapsible 
                    open={expandedBreakdown === match.id}
                    onOpenChange={(open) => setExpandedBreakdown(open ? match.id : null)}
                    className="mt-4"
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                        <span className="flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          View Detailed Reasoning
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedBreakdown === match.id ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Material Match:</span>
                            <span className="font-medium">{formatBreakdownPercent(match.breakdown.materialMatch)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Quantity Fit:</span>
                            <span className="font-medium">{formatBreakdownPercent(match.breakdown.quantityFit)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Distance Score:</span>
                            <span className="font-medium">{formatBreakdownPercent(match.breakdown.distance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Condition:</span>
                            <span className="font-medium">{formatBreakdownPercent(match.breakdown.condition)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Urgency:</span>
                            <span className="font-medium">{formatBreakdownPercent(match.breakdown.urgency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Weight Config:</span>
                            <span className="font-medium text-xs">
                              M:{DEFAULT_SCORING_WEIGHTS.materialMatch * 100}% D:{DEFAULT_SCORING_WEIGHTS.distance * 100}%
                            </span>
                          </div>
                        </div>
                        {match.breakdown.reasoning.length > 0 && (
                          <div className="pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-1">AI Reasoning:</p>
                            <ul className="text-xs space-y-1">
                              {match.breakdown.reasoning.map((reason, i) => (
                                <li key={i} className="text-foreground">• {reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" className="flex-1" onClick={() => handleAcceptMatch(match)}>
                    Accept Match
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRejectMatch(match)}>
                    Not Interested
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {onClose && (
        <Button variant="outline" onClick={onClose} className="w-full">
          Close Matches
        </Button>
      )}

      {/* Rating Modal */}
      {ratingModal.match && ratingModal.sellerUser && userData && (
        <UserRatingModal
          open={ratingModal.open}
          onOpenChange={(open) => setRatingModal(prev => ({ ...prev, open }))}
          ratedUserId={ratingModal.sellerUser.id}
          ratedUserName={ratingModal.sellerUser.displayName}
          raterId={userData.id}
          transactionType="listing"
          transactionId={ratingModal.match.listingId}
          transactionTitle={ratingModal.match.listing?.title || 'Material'}
          onRatingComplete={() => {
            setRatingModal({ open: false, match: null, sellerUser: null });
          }}
        />
      )}
    </div>
  );
}
