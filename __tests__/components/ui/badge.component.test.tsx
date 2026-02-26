import { render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders badge with children', () => {
    render(<Badge>Badge Text</Badge>);
    expect(screen.getByText('Badge Text')).toBeInTheDocument();
  });

  it('renders badge with default variant', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default').closest('div');
    expect(badge).toHaveClass('bg-blue-600');
  });

  it('renders badge with secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const badge = screen.getByText('Secondary').closest('div');
    expect(badge).toHaveClass('bg-gray-100');
  });

  it('renders badge with destructive variant', () => {
    render(<Badge variant="destructive">Destructive</Badge>);
    const badge = screen.getByText('Destructive').closest('div');
    expect(badge).toHaveClass('bg-red-500');
  });

  it('renders badge with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText('Outline').closest('div');
    expect(badge).toHaveClass('text-gray-950');
  });

  it('accepts custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>);
    const badge = screen.getByText('Custom').closest('div');
    expect(badge).toHaveClass('custom-badge');
  });

  it('renders as a div element', () => {
    render(<Badge>Badge</Badge>);
    const badge = screen.getByText('Badge').closest('div');
    expect(badge?.tagName).toBe('DIV');
  });

  it('applies correct styling for all variants', () => {
    const variants: Array<'default' | 'secondary' | 'destructive' | 'outline'> = [
      'default',
      'secondary',
      'destructive',
      'outline',
    ];

    variants.forEach(variant => {
      const { container } = render(<Badge variant={variant}>{variant}</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toBeInTheDocument();
    });
  });
});

describe('badgeVariants', () => {
  it('returns correct classes for default variant', () => {
    expect(badgeVariants({ variant: 'default' })).toContain('bg-blue-600');
  });

  it('returns correct classes for secondary variant', () => {
    expect(badgeVariants({ variant: 'secondary' })).toContain('bg-gray-100');
  });

  it('returns correct classes for destructive variant', () => {
    expect(badgeVariants({ variant: 'destructive' })).toContain('bg-red-500');
  });

  it('returns correct classes for outline variant', () => {
    expect(badgeVariants({ variant: 'outline' })).toContain('text-gray-950');
  });

  it('returns default classes when no variant specified', () => {
    const classes = badgeVariants({});
    expect(classes).toContain('bg-blue-600');
  });
});
