import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8">
          <p className="text-6xl font-extrabold tracking-tight text-primary/20">404</p>
          <h1 className="mt-3 text-2xl font-bold">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/">Back to home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
