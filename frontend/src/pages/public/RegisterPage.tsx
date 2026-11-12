import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/auth.store';

const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Create your account — Instaflow';
    return () => clearError();
  }, [clearError]);

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min(score, 4);
  }, [password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    if (!acceptTerms) {
      setFormError('Please accept the terms and privacy policy');
      return;
    }

    try {
      await register({
        name,
        email,
        password,
        workspaceName: workspaceName.trim() || undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <Card>
          <CardContent className="p-7">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Create your workspace</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Start automating for free — no credit card required.
              </p>
            </div>

            {(formError || error) && (
              <Alert variant="destructive" className="mb-5">
                <AlertIcon variant="destructive" />
                <AlertDescription>{formError ?? error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1.5 pt-1">
                    <Progress
                      value={(strength / 4) * 100}
                      indicatorClassName={
                        strength <= 1 ? 'bg-destructive' : strength <= 2 ? 'bg-warning' : 'bg-success'
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Password strength: {strengthLabels[strength]}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspace">Workspace name (optional)</Label>
                <Input
                  id="workspace"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Acme Marketing"
                  maxLength={120}
                />
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
                />
                <span className="text-muted-foreground">
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              <Button type="submit" className="w-full" size="lg" loading={isLoading}>
                Create account
              </Button>
            </form>

            <ul className="mt-6 space-y-2 border-t border-border pt-5">
              {[
                '500 free automation events every month',
                '1 Instagram account and 2 active automations',
                'Connect your Instagram in under a minute',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-success" /> {item}
                </li>
              ))}
            </ul>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
