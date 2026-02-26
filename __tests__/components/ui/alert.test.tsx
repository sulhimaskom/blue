import { render, screen, fireEvent } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

describe('Alert', () => {
  it('renders Alert component', () => {
    render(<Alert>Alert content</Alert>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    render(<Alert>Default Alert</Alert>);
    const alert = screen.getByRole('status');
    expect(alert).toHaveClass('bg-background');
  });

  it('renders with destructive variant and alert role', () => {
    render(<Alert variant="destructive">Destructive Alert</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders with warning variant', () => {
    render(<Alert variant="warning">Warning Alert</Alert>);
    const alert = screen.getByRole('status');
    expect(alert).toHaveClass('text-yellow-700');
  });

  it('renders with success variant', () => {
    render(<Alert variant="success">Success Alert</Alert>);
    const alert = screen.getByRole('status');
    expect(alert).toHaveClass('text-green-700');
  });

  it('renders with info variant', () => {
    render(<Alert variant="info">Info Alert</Alert>);
    const alert = screen.getByRole('status');
    expect(alert).toHaveClass('text-blue-700');
  });

  it('renders AlertTitle', () => {
    render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
      </Alert>
    );
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
  });

  it('renders AlertDescription', () => {
    render(
      <Alert>
        <AlertDescription>Alert description text</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Alert description text')).toBeInTheDocument();
  });

  it('renders complete alert structure', () => {
    render(
      <Alert>
        <AlertTitle>Success!</AlertTitle>
        <AlertDescription>Operation completed successfully.</AlertDescription>
      </Alert>
    );

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Operation completed successfully.')).toBeInTheDocument();
  });

  it('calls onDismiss when dismissible and button clicked', () => {
    const handleDismiss = jest.fn();
    render(
      <Alert dismissible onDismiss={handleDismiss}>
        Dismissible Alert
      </Alert>
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render dismiss button when not dismissible', () => {
    render(<Alert>Non-dismissible Alert</Alert>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render dismiss button when onDismiss not provided', () => {
    render(<Alert dismissible>Alert without handler</Alert>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Alert className="custom-alert">Custom</Alert>);
    expect(screen.getByRole('status')).toHaveClass('custom-alert');
  });

  it('has correct aria-live for destructive variant', () => {
    render(<Alert variant="destructive">Destructive</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('has correct aria-live for non-destructive variant', () => {
    render(<Alert variant="success">Success</Alert>);
    const alert = screen.getByRole('status');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });
});
