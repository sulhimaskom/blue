import { render, screen } from '@testing-library/react';
import { StatusIndicator } from '@/components/ui/status-indicator';
import type { StatusType } from '@/lib/services/service-types';

describe('StatusIndicator', () => {
  it('renders healthy status', () => {
    render(<StatusIndicator status="healthy" />);
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('renders degraded status', () => {
    render(<StatusIndicator status="degraded" />);
    expect(screen.getByText('Degraded')).toBeInTheDocument();
  });

  it('renders unhealthy status', () => {
    render(<StatusIndicator status="unhealthy" />);
    expect(screen.getByText('Unhealthy')).toBeInTheDocument();
  });

  it('renders unknown status for invalid status', () => {
    render(<StatusIndicator status="unknown" as StatusType />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<StatusIndicator status="healthy" size="sm" />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<StatusIndicator status="healthy" size="md" />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<StatusIndicator status="healthy" size="lg" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    render(<StatusIndicator status="healthy" showIcon={false} />);
    const status = screen.getByRole('status');
    // Icon should not be present when showIcon is false - no SVG elements
    expect(status.querySelectorAll('svg').length).toBe(0);
  });

  it('hides text when showText is false', () => {
    render(<StatusIndicator status="healthy" showText={false} />);
    expect(screen.queryByText('Healthy')).not.toBeInTheDocument();
  });

  it('shows both icon and text by default', () => {
    render(<StatusIndicator status="healthy" />);
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    const status = screen.getByRole('status');
    expect(status.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('has correct ARIA attributes', () => {
    render(<StatusIndicator status="healthy" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-label', 'Healthy status');
  });

  it('accepts custom className', () => {
    render(<StatusIndicator status="healthy" className="custom-status" />);
    const status = screen.getByRole('status');
    expect(status).toHaveClass('custom-status');
  });

  it('renders all status types correctly', () => {
    const statuses: StatusType[] = ['healthy', 'degraded', 'unhealthy'];

    statuses.forEach(status => {
      const { container } = render(<StatusIndicator status={status} />);
      const statusElement = container.querySelector('[role="status"]');
      expect(statusElement).toBeInTheDocument();
    });
  });
});
