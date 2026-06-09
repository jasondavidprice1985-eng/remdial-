import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders PENDING for pending status', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('renders QUERY for query status', () => {
    render(<StatusBadge status="query" />);
    expect(screen.getByText('QUERY')).toBeInTheDocument();
  });

  it('renders ORDERED for ordered status', () => {
    render(<StatusBadge status="ordered" />);
    expect(screen.getByText('ORDERED')).toBeInTheDocument();
  });

  it('renders ARCHIVED for archived status', () => {
    render(<StatusBadge status="archived" />);
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
  });
});
