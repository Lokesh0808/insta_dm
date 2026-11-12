import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Reset your password — Instaflow';
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>

        <Card>
          <CardContent className="p-7">
            {sent ? (
              <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </span>
                <h1 className="mt-4 text-xl font-bold">Check your inbox</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  If an account exists for <span className="font-medium text-foreground">{email}</span>,
                  we sent a password reset link. It expires in 1 hour.
                </p>
                <Button asChild variant="outline" className="mt-6 w-full">
                  <Link to="/login">Back to sign in</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Enter your email and we will send you a link to reset your password.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" size="lg" loading={loading}>
                    Send reset link
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
