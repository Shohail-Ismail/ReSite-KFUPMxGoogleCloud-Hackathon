import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight } from 'lucide-react';

interface OnboardingGateProps {
  children: React.ReactNode;
  action?: string; // e.g., "create listings", "create requests"
}

/**
 * Component that gates access to features requiring onboarding.
 * Shows a prompt to complete onboarding if the user hasn't done so.
 */
export function OnboardingGate({ children, action = 'access this feature' }: OnboardingGateProps) {
  const { isOnboarded } = useAuth();
  const navigate = useNavigate();

  if (isOnboarded) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <Card className="border-primary/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">Profile Verification Required</CardTitle>
          <CardDescription className="mt-2">
            You need to complete your profile verification to {action}.
            This helps us maintain a trusted marketplace.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => navigate('/onboarding')} className="gap-2">
            Complete Verification
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Hook to check if user can perform onboarded-only actions.
 */
export function useOnboardingGate() {
  const { isOnboarded, userData } = useAuth();
  
  return {
    isOnboarded,
    canCreateListing: isOnboarded,
    canCreateRequest: isOnboarded,
    onboardingStatus: userData?.onboardingStatus || 'pending',
  };
}
