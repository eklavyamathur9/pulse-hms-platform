import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies primary variant by default', () => {
    const { container } = render(<Button>Primary</Button>);
    const btn = container.querySelector('button');
    expect(btn).toHaveClass('bg-blue-600');
  });

  it('applies secondary variant', () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);
    const btn = container.querySelector('button');
    expect(btn).toHaveClass('bg-gray-200');
  });

  it('applies danger variant', () => {
    const { container } = render(<Button variant="danger">Danger</Button>);
    const btn = container.querySelector('button');
    expect(btn).toHaveClass('bg-red-600');
  });

  it('shows spinner when loading', () => {
    const { container } = render(<Button loading>Loading</Button>);
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('disables button when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders with custom className', () => {
    const { container } = render(<Button className="custom-class">Styled</Button>);
    expect(container.querySelector('button')).toHaveClass('custom-class');
  });

  it('forwards additional props', () => {
    render(<Button data-testid="test-btn">Test</Button>);
    expect(screen.getByTestId('test-btn')).toBeInTheDocument();
  });
});
