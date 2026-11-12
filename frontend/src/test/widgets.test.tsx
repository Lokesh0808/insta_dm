import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard, EmptyState, ErrorState } from '@/dashboard/widgets';
import { Target } from 'lucide-react';

describe('Dashboard widgets', () => {
  it('renders a stat card with a formatted value', () => {
    render(<StatCard title="Leads captured" value={1500} icon={Target} hint="all time" />);

    expect(screen.getByText('Leads captured')).toBeInTheDocument();
    expect(screen.getByText('1.5K')).toBeInTheDocument();
    expect(screen.getByText('all time')).toBeInTheDocument();
  });

  it('renders a skeleton while loading', () => {
    const { container } = render(
      <StatCard title="Automated DMs" value={0} icon={Target} isLoading />,
    );
    expect(container.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(0);
  });

  it('renders an empty state with a call to action', () => {
    render(
      <EmptyState
        icon={Target}
        title="No leads yet"
        description="Enable lead capture to start collecting leads."
        action={<button>Create automation</button>}
      />,
    );

    expect(screen.getByText('No leads yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create automation' })).toBeInTheDocument();
  });

  it('renders an error state with a retry handler', async () => {
    let retried = false;
    render(
      <ErrorState description="Network error" onRetry={() => { retried = true; }} />,
    );

    expect(screen.getByText('Network error')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(retried).toBe(true);
  });
});
