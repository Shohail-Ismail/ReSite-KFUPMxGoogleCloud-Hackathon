import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, FileText, Building } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { getAllActiveListings, getAllOpenRequests, getAllOrganisations } from '@/services/firestoreService';
import type { Listing, Request, Organisation } from '@/types';

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadSearchData();
    }
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const loadSearchData = async () => {
    try {
      const [listingsData, requestsData, orgsData] = await Promise.all([
        getAllActiveListings(),
        getAllOpenRequests(),
        getAllOrganisations(),
      ]);
      setListings(listingsData);
      setRequests(requestsData);
      setOrganisations(orgsData);
    } catch (error) {
      console.error('Error loading search data:', error);
    }
  };

  // Filter results based on search query
  const filteredListings = listings.filter(
    (l) =>
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.materialType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = requests.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.materialType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrganisations = organisations.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectListing = () => {
    setOpen(false);
    navigate('/dashboard/listings');
  };

  const handleSelectRequest = () => {
    setOpen(false);
    navigate('/dashboard/requests');
  };

  const handleSelectOrganisation = () => {
    setOpen(false);
    navigate('/dashboard/organisation');
  };

  return (
    <>
      {/* Search trigger */}
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2 w-full max-w-sm px-3 py-2 text-sm text-muted-foreground rounded-lg border border-input bg-background/50 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all duration-200"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search listings, requests, organisations..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </CommandEmpty>

          {filteredListings.length > 0 && (
            <CommandGroup heading="Listings">
              {filteredListings.slice(0, 5).map((listing) => (
                <CommandItem 
                  key={listing.id} 
                  onSelect={handleSelectListing}
                  className="cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 mr-3">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{listing.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {listing.materialType.replace('_', ' ')}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredRequests.length > 0 && (
            <CommandGroup heading="Requests">
              {filteredRequests.slice(0, 5).map((request) => (
                <CommandItem 
                  key={request.id} 
                  onSelect={handleSelectRequest}
                  className="cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 mr-3">
                    <FileText className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{request.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {request.materialType.replace('_', ' ')}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredOrganisations.length > 0 && (
            <CommandGroup heading="Organisations">
              {filteredOrganisations.slice(0, 5).map((org) => (
                <CommandItem 
                  key={org.id} 
                  onSelect={handleSelectOrganisation}
                  className="cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted mr-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{org.name}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
