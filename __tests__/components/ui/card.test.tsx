import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

describe('Card', () => {
  it('renders Card component', () => {
    const { container } = render(<Card>Card content</Card>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders Card with children', () => {
    render(<Card>Test content</Card>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies base classes', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('shadow-sm');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders CardHeader', () => {
    render(
      <Card>
        <CardHeader>Header content</CardHeader>
      </Card>
    );
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('renders CardTitle', () => {
    render(
      <Card>
        <CardTitle>Card Title</CardTitle>
      </Card>
    );
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('renders CardDescription', () => {
    render(
      <Card>
        <CardDescription>Card Description</CardDescription>
      </Card>
    );
    expect(screen.getByText('Card Description')).toBeInTheDocument();
  });

  it('renders CardContent', () => {
    render(
      <Card>
        <CardContent>Card Content</CardContent>
      </Card>
    );
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('renders CardFooter', () => {
    render(
      <Card>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText('Card Footer')).toBeInTheDocument();
  });

  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Complete Card</CardTitle>
          <CardDescription>This is a description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content here</p>
        </CardContent>
        <CardFooter>
          <p>Footer content</p>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Complete Card')).toBeInTheDocument();
    expect(screen.getByText('This is a description')).toBeInTheDocument();
    expect(screen.getByText('Main content here')).toBeInTheDocument();
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('applies hover effects', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('hover:shadow-md');
    expect(card).toHaveClass('hover:scale-[1.01]');
  });
});
