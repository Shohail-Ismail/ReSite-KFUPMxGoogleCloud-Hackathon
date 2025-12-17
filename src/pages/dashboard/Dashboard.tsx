import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, FileText, Leaf, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { getListingsByOrganisation, getRequestsByOrganisation } from '@/services/firestoreService';
import type { Listing, Request } from '@/types';

export default function Dashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeListings: 0,
    openRequests: 0,
    co2Saved: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.organisationId) return;

    const loadStats = async () => {
      try {
        const [listings, requests] = await Promise.all([
          getListingsByOrganisation(userData.organisationId),
          getRequestsByOrganisation(userData.organisationId),
        ]);

        const activeListings = listings.filter((l: Listing) => l.status === 'active').length;
        const openRequests = requests.filter((r: Request) => r.status === 'open').length;
        
        setStats({
          activeListings,
          openRequests,
          co2Saved: 0,
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [userData?.organisationId]);

  const statCards = [
    {
      title: 'Active Listings',
      value: stats.activeListings,
      description: 'Surplus materials available',
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Open Requests',
      value: stats.openRequests,
      description: 'Materials needed',
      icon: FileText,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'CO₂ Impact',
      value: `${stats.co2Saved.toFixed(1)} kg`,
      description: 'Estimated carbon saved',
      icon: Leaf,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in-up">
      {/* Welcome Card */}
      <Card className="relative overflow-hidden border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <CardHeader className="relative pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Welcome back</span>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold">
            Hello, {userData?.displayName}!
          </CardTitle>
          <CardDescription className="text-base max-w-xl">
            Manage your circular economy activities and reduce construction waste
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title} className="card-interactive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">
                {loading ? (
                  <div className="h-9 w-16 bg-muted rounded animate-pulse" />
                ) : (
                  stat.value
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with circular construction</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Button 
            onClick={() => navigate('/dashboard/create-listing')} 
            size="lg"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Listing
          </Button>
          <Button 
            onClick={() => navigate('/dashboard/create-request')} 
            variant="outline" 
            size="lg"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Request
          </Button>
          <Button 
            onClick={() => navigate('/dashboard/map')} 
            variant="secondary" 
            size="lg"
            className="gap-2"
          >
            View Map
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-interactive">
          <CardHeader>
            <CardTitle className="text-lg">About ReSite</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p className="leading-relaxed">
              ReSite connects construction sites with surplus materials to those who need them,
              reducing waste and supporting Saudi Vision 2030's sustainability goals.
            </p>
            <p className="font-medium text-foreground">
              Together, we're building a circular economy for construction.
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader>
            <CardTitle className="text-lg">Get Started</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ol className="space-y-2.5">
              {[
                'List your surplus materials or create material requests',
                'View available materials on the interactive map',
                'Connect with other organisations in your region',
                'Track your environmental impact',
              ].map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
