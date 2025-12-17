import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRequestsByOrganisation } from '@/services/firestoreService';
import type { Request, MaterialType } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { MatchesDisplay } from '@/components/MatchesDisplay';

const MATERIAL_LABELS: Record<MaterialType, string> = {
  steel_beam: 'Steel Beam',
  rebar: 'Rebar',
  concrete: 'Concrete',
  aggregates: 'Aggregates',
  timber: 'Timber',
};

const URGENCY_COLORS = {
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  high: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

export default function Requests() {
  const navigate = useNavigate();
  const { organisation, isOnboarded } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMaterial, setFilterMaterial] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showMatches, setShowMatches] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [organisation]);

  useEffect(() => {
    if (filterMaterial === 'all') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(r => r.materialType === filterMaterial));
    }
  }, [filterMaterial, requests]);

  const loadRequests = async () => {
    if (!organisation) return;

    try {
      const data = await getRequestsByOrganisation(organisation.id);
      setRequests(data);
      setFilteredRequests(data);
    } catch (error) {
      toast.error('Failed to load requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFindMatches = (request: Request) => {
    setSelectedRequest(request);
    setShowMatches(true);
  };

  if (loading) {
    return <div className="text-center py-12">Loading requests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Requests</h1>
          <p className="text-muted-foreground mt-1">Materials you're looking for</p>
        </div>
        {isOnboarded ? (
          <Button onClick={() => navigate('/dashboard/create-request')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Request
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" disabled className="opacity-60">
                <Shield className="h-4 w-4 mr-2" />
                Create Request
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Complete profile verification to create requests</p>
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
          Showing {filteredRequests.length} of {requests.length} requests
        </p>
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No requests found. Create your first request!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{request.title}</CardTitle>
                  <Badge variant={request.status === 'open' ? 'default' : 'secondary'}>
                    {request.status}
                  </Badge>
                </div>
                <CardDescription>{MATERIAL_LABELS[request.materialType]}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground line-clamp-2">{request.description}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-medium text-foreground">
                      {request.quantityValue} {request.quantityUnit}
                    </span>
                    <Badge className={URGENCY_COLORS[request.urgency]}>
                      {request.urgency} urgency
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {request.location.address}
                  </p>
                  
                  {request.status === 'open' && (
                    <Button 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => handleFindMatches(request)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Find AI Matches
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Matches Dialog */}
      <Dialog open={showMatches} onOpenChange={setShowMatches}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Matches for: {selectedRequest?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <MatchesDisplay 
              request={selectedRequest} 
              onClose={() => setShowMatches(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
