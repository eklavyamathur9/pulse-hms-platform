import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../components/ui/Input';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('renders helper text', () => {
    render(<Input helperText="Enter your full name" />);
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
  });

  it('hides helper text when error is present', () => {
    render(<Input helperText="Help" error="Error!" />);
    expect(screen.getByText('Error!')).toBeInTheDocument();
    expect(screen.queryByText('Help')).not.toBeInTheDocument();
  });

  it('applies error border class when error is set', () => {
    const { container } = render(<Input error="Error" />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('border-red-500');
  });

  it('applies disabled state', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('generates id from label', () => {
    render(<Input label="Email Address" />);
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('id', 'email-address');
  });

  it('uses provided id instead of generated one', () => {
    render(<Input label="Email" id="custom-id" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'custom-id');
  });

  it('accepts value and onChange', () => {
    const handleChange = () => {};
    render(<Input value="test" onChange={handleChange} />);
    expect(screen.getByRole('textbox')).toHaveValue('test');
  });
});
