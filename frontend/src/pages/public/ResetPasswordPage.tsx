import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = 'Choose a new password — Instaflow';
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ token, password });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-7 text-center">
            <h1 className="text-xl font-bold">Invalid reset link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This password reset link is missing or malformed.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <Card>
          <CardContent className="p-7">
            {done ? (
              <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </span>
                <h1 className="mt-4 text-xl font-bold">Password updated</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your password has been changed. Redirecting you to sign in…
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Pick something strong — at least 8 characters with upper case, lower case and a
                  number.
                </p>

                {error && (
                  <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm new password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" loading={loading}>
                    Update password
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
