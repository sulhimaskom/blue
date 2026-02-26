import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

describe('Card', () => {
  it('renders card component', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders card with custom className', () => {
    render(<Card className="custom-card">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('custom-card');
  });
});

describe('CardHeader', () => {
  it('renders card header', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<CardHeader className="custom-header">Header</CardHeader>);
    const header = screen.getByText('Header').closest('div');
    expect(header).toHaveClass('custom-header');
  });
});

describe('CardTitle', () => {
  it('renders card title as heading', () => {
    render(<CardTitle>My Card Title</CardTitle>);
    const title = screen.getByRole('heading', { name: /my card title/i });
    expect(title).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<CardTitle className="custom-title">Title</CardTitle>);
    const title = screen.getByRole('heading');
    expect(title).toHaveClass('custom-title');
  });
});

describe('CardDescription', () => {
  it('renders card description', () => {
    render(<CardDescription>Card description text</CardDescription>);
    expect(screen.getByText('Card description text')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<CardDescription className="custom-desc">Description</CardDescription>);
    const desc = screen.getByText('Description').closest('p');
    expect(desc).toHaveClass('custom-desc');
  });
});

describe('CardContent', () => {
  it('renders card content', () => {
    render(<CardContent>Card body content</CardContent>);
    expect(screen.getByText('Card body content')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<CardContent className="custom-content">Content</CardContent>);
    const content = screen.getByText('Content').closest('div');
    expect(content).toHaveClass('custom-content');
  });
});

describe('CardFooter', () => {
  it('renders card footer', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<CardFooter className="custom-footer">Footer</CardFooter>);
    const footer = screen.getByText('Footer').closest('div');
    expect(footer).toHaveClass('custom-footer');
  });
});

describe('Card Composition', () => {
  it('renders complete card with all subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    );

    expect(screen.getByRole('heading', { name: /card title/i })).toBeInTheDocument();
    expect(screen.getByText('Card Description')).toBeInTheDocument();
    expect(screen.getByText('Card Content')).toBeInTheDocument();
    expect(screen.getByText('Card Footer')).toBeInTheDocument();
  });
});
