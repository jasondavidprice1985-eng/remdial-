import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBanner from '../components/StatusBanner';

describe('StatusBanner', () => {
  it('renders nothing when banner is none', () => {
    const { container } = render(<StatusBanner banner="none" />);
    expect(container.innerHTML).toBe('');
  });

  it('shows submitting state with spinner', () => {
    render(<StatusBanner banner="sending" />);
    expect(screen.getByText('Submitting ticket…')).toBeInTheDocument();
  });

  it('shows submitted state with ref', () => {
    render(<StatusBanner banner="submitted" submittedRef="RM-ABC123" />);
    expect(screen.getByText(/Ticket submitted/)).toBeInTheDocument();
    expect(screen.getByText(/RM-ABC123/)).toBeInTheDocument();
  });

  it('shows offline state', () => {
    render(<StatusBanner banner="offline" />);
    expect(screen.getByText(/No signal/)).toBeInTheDocument();
  });

  it('shows synced state', () => {
    render(<StatusBanner banner="synced" />);
    expect(screen.getByText(/All offline tickets synced/)).toBeInTheDocument();
  });

  it('shows submitted state without ref', () => {
    render(<StatusBanner banner="submitted" />);
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });
});
