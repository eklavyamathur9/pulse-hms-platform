import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from '../components/common/StatCard';

describe('StatCard', () => {
  const defaultProps = {
    icon: '📊',
    label: 'Revenue',
    value: '$12,345',
    color: '#059669',
    bg: '#ecfdf5',
  };

  it('renders label and value', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText(/Revenue/)).toBeInTheDocument();
    expect(screen.getByText('$12,345')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText(/📊/)).toBeInTheDocument();
  });

  it('applies background color', () => {
    const { container } = render(<StatCard {...defaultProps} />);
    const card = container.firstChild;
    expect(card).toHaveStyle(`background: ${defaultProps.bg}`);
  });

  it('renders with minimal props', () => {
    render(<StatCard label="Test" value="42" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
