import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader } from '../components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies padding class by default', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).toHaveClass('p-6');
  });

  it('removes padding when padding=false', () => {
    const { container } = render(<Card padding={false}>Content</Card>);
    expect(container.firstChild).not.toHaveClass('p-6');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('CardHeader', () => {
  it('renders title', () => {
    render(<CardHeader title="My Title" />);
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<CardHeader title="Title" subtitle="Sub text" />);
    expect(screen.getByText('Sub text')).toBeInTheDocument();
  });

  it('renders action element', () => {
    render(<CardHeader title="Title" action={<button>Action</button>} />);
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<CardHeader title="Title" />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });
});
