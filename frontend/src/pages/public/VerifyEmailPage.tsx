import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { authService } from '@/services';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const verified = useRef(false);

  useEffect(() => {
    document.title = 'Verify your email — Instaflow';
  }, []);

  useEffect(() => {
    if (!token || verified.current) return;
    verified.current = true;
    setStatus('loading');
    authService
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage((err as Error).message);
      });
  }, [token]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <Card>
          <CardContent className="p-7 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                <h1 className="mt-4 text-xl font-bold">Verifying your email…</h1>
              </>
            )}

            {status === 'success' && (
              <>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </span>
                <h1 className="mt-4 text-xl font-bold">Email verified</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your account is ready. Connect an Instagram account to start automating.
                </p>
                <Button asChild className="mt-6 w-full">
                  <Link to="/dashboard">Open dashboard</Link>
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                  <MailCheck className="h-6 w-6 text-warning" />
                </span>
                <h1 className="mt-4 text-xl font-bold">Verification failed</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {message ?? 'This verification link is invalid or has expired.'}
                </p>
                <Button asChild variant="outline" className="mt-6 w-full">
                  <Link to="/login">Back to sign in</Link>
                </Button>
              </>
            )}

            {status === 'idle' && (
              <>
                <h1 className="text-xl font-bold">Check your inbox</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We are verifying your email address…
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
