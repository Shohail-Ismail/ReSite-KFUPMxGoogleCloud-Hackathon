import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getListingsByOrganisation } from '@/services/firestoreService';
import type { Listing, MaterialType } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';

const MATERIAL_LABELS: Record<MaterialType, string> = {
  steel_beam: 'Steel Beam',
  rebar: 'Rebar',
  concrete: 'Concrete',
  aggregates: 'Aggregates',
  timber: 'Timber',
};

export default function Listings() {
  const navigate = useNavigate();
  const { organisation, isOnboarded } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMaterial, setFilterMaterial] = useState<string>('all');

  useEffect(() => {
    loadListings();
  }, [organisation]);

  useEffect(() => {
    if (filterMaterial === 'all') {
      setFilteredListings(listings);
    } else {
      setFilteredListings(listings.filter(l => l.materialType === filterMaterial));
    }
  }, [filterMaterial, listings]);

  const loadListings = async () => {
    if (!organisation) return;

    try {
      const data = await getListingsByOrganisation(organisation.id);
      setListings(data);
      setFilteredListings(data);
    } catch (error) {
      toast.error('Failed to load listings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading listings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Listings</h1>
          <p className="text-muted-foreground mt-1">Surplus materials available for reuse</p>
        </div>
        {isOnboarded ? (
          <Button onClick={() => navigate('/dashboard/create-listing')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Listing
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" disabled className="opacity-60">
                <Shield className="h-4 w-4 mr-2" />
                Create Listing
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Complete profile verification to create listings</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Select value={filterMaterial} onValueChange={setFilterMaterial}>
          <SelectTrigger className="w-48 bg-card">
            <SelectValue placeholder="Filter by material" />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="all">All Materials</SelectItem>
            {Object.entries(MATERIAL_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Showing {filteredListings.length} of {listings.length} listings
        </p>
      </div>

      {filteredListings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No listings found. Create your first listing!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map((listing) => (
            <Card key={listing.id} className="hover:shadow-lg transition-shadow">
              {listing.imageUrl && (
                <div className="h-48 overflow-hidden rounded-t-lg">
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{listing.title}</CardTitle>
                  <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                    {listing.status}
                  </Badge>
                </div>
                <CardDescription>{MATERIAL_LABELS[listing.materialType]}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground line-clamp-2">{listing.description}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-medium text-foreground">
                      {listing.quantityValue} {listing.quantityUnit}
                    </span>
                    <Badge variant="outline">{listing.condition}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {listing.location.address}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
