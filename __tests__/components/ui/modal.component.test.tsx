import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/ui/modal';

describe('Modal', () => {
  it('renders modal when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        Modal Content
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render modal when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        Modal Content
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Modal Content
      </Modal>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test" size="md">
        Content
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Test other sizes by rerendering
    const sizes = ['sm', 'lg', 'xl', 'full'] as const;
    sizes.forEach(size => {
      rerender(
        <Modal isOpen={true} onClose={() => {}} title="Test" size={size}>
          Content
        </Modal>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('renders footer when provided', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        footer={<button>Footer Button</button>}
      >
        Modal Content
      </Modal>
    );
    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" showCloseButton={false}>
        Modal Content
      </Modal>
    );
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('renders with custom aria-label', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" aria-label="Custom Modal Label">
        Modal Content
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Custom Modal Label');
  });

  it('has correct ARIA attributes', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        Modal Content
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('role', 'dialog');
  });

  it('accepts custom className', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" className="custom-modal">
        Modal Content
      </Modal>
    );

    // className is applied to the inner document div
    const dialog = screen.getByRole('document');
    expect(dialog).toHaveClass('custom-modal');
  });

  it('renders modal title in header', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Modal Title">
        Content
      </Modal>
    );

    const title = screen.getByText('Modal Title');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H2');
  });
});
