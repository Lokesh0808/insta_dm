import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber, initials, relativeTime, slugify } from '@/lib/utils';

describe('Button component', () => {
  it('renders the label and fires the click handler', async () => {
    let clicked = false;
    render(
      <Button onClick={() => { clicked = true; }}>Launch automation</Button>,
    );

    const button = screen.getByRole('button', { name: /launch automation/i });
    expect(button).toBeInTheDocument();

    await userEvent.click(button);
    expect(clicked).toBe(true);
  });

  it('disables the button while loading', () => {
    render(<Button loading>Saving</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Badge component', () => {
  it('applies the requested variant', () => {
    render(<Badge variant="success">Live</Badge>);
    expect(screen.getByText('Live')).toHaveClass('bg-success');
  });
});

describe('formatters', () => {
  it('formats compact numbers', () => {
    expect(formatNumber(12500)).toBe('12.5K');
  });

  it('formats currency', () => {
    expect(formatCurrency(2499, 'INR')).toContain('2,499');
  });

  it('creates initials', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials(undefined)).toBe('?');
  });

  it('slugifies strings', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });

  it('describes relative time', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(twoHoursAgo)).toContain('hour');
  });
});
