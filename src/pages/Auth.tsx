import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Recycle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { signInSchema, signUpSchema, validateForm } from '@/lib/validations';
import { demoCredentials } from '@private/secrets';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign up state
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgAddress, setOrgAddress] = useState('');

  const clearErrors = () => setFormErrors({});

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // Validate form data
    const validation = validateForm(signInSchema, {
      email: signInEmail,
      password: signInPassword,
    });

    if (!validation.success) {
      setFormErrors('errors' in validation ? validation.errors : {});
      return;
    }

    setLoading(true);

    try {
      await signIn(validation.data.email, validation.data.password);
      toast.success('Successfully signed in!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // Validate form data
    const validation = validateForm(signUpSchema, {
      email: signUpEmail,
      password: signUpPassword,
      displayName,
      orgName,
      orgAddress,
    });

    if (!validation.success) {
      setFormErrors('errors' in validation ? validation.errors : {});
      return;
    }

    setLoading(true);

    try {
      await signUp(validation.data.email, validation.data.password, validation.data.displayName, {
        name: validation.data.orgName,
        address: validation.data.orgAddress,
      });
      toast.success('Account created! Please complete your profile.');
      navigate('/onboarding');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setSignInEmail(demoCredentials.email);
    setSignInPassword(demoCredentials.password);
    clearErrors();
  };

  const renderError = (field: string) => {
    if (formErrors[field]) {
      return <p className="text-sm text-destructive mt-1">{formErrors[field]}</p>;
    }
    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Recycle className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">ReSite</CardTitle>
          <CardDescription>Circular Economy Platform for Construction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="signin" className="w-full" onValueChange={clearErrors}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className={formErrors.email ? 'border-destructive' : ''}
                  />
                  {renderError('email')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className={formErrors.password ? 'border-destructive' : ''}
                  />
                  {renderError('password')}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={100}
                    className={formErrors.displayName ? 'border-destructive' : ''}
                  />
                  {renderError('displayName')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    maxLength={255}
                    className={formErrors.email ? 'border-destructive' : ''}
                  />
                  {renderError('email')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className={formErrors.password ? 'border-destructive' : ''}
                  />
                  {renderError('password')}
                  <p className="text-xs text-muted-foreground">
                    Min 8 characters with uppercase, lowercase, and number
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organisation Name</Label>
                  <Input
                    id="org-name"
                    type="text"
                    placeholder="Construction Co."
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    maxLength={200}
                    className={formErrors.orgName ? 'border-destructive' : ''}
                  />
                  {renderError('orgName')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-address">Organisation Address</Label>
                  <Input
                    id="org-address"
                    type="text"
                    placeholder="Riyadh, Saudi Arabia"
                    value={orgAddress}
                    onChange={(e) => setOrgAddress(e.target.value)}
                    maxLength={500}
                    className={formErrors.orgAddress ? 'border-destructive' : ''}
                  />
                  {renderError('orgAddress')}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <Alert className="bg-muted/50 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="flex flex-col gap-2">
              <span className="text-sm font-medium">Demo Account</span>
              <span className="text-xs text-muted-foreground">
                Email: {demoCredentials.email} | Password: {demoCredentials.password}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={fillDemoCredentials}
              >
                Use Demo Credentials
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
