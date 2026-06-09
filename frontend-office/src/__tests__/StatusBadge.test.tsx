import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders Pending for pending status', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders Query for query status', () => {
    render(<StatusBadge status="query" />);
    expect(screen.getByText('Query')).toBeInTheDocument();
  });

  it('renders Ordered for ordered status', () => {
    render(<StatusBadge status="ordered" />);
    expect(screen.getByText('Ordered')).toBeInTheDocument();
  });

  it('renders Archived for archived status', () => {
    render(<StatusBadge status="archived" />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });
});
