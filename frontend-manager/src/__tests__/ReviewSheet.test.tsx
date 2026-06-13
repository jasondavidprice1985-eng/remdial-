import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewSheet from '../components/ReviewSheet';
import type { LineItemInput } from '@shared/types';

const filledItem: LineItemInput = { description: 'Hinge', quantity: 2, reason: 'damaged_on_arrival' };

function renderReview(props: Partial<{
  open: boolean;
  developer: string;
  site: string;
  plot: string;
  items: LineItemInput[];
  deliveryType: '' | 'next_delivery' | 'specific_date';
  deliveryDate: string;
  photoCount: number;
  submitting: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSend: () => void;
}> = {}) {
  const defaults = {
    open: true,
    developer: 'Test Dev',
    site: 'Test Site',
    plot: 'P123',
    items: [filledItem],
    deliveryType: 'next_delivery' as '' | 'next_delivery' | 'specific_date',
    deliveryDate: '',
    photoCount: 0,
    submitting: false,
    onEdit: vi.fn(),
    onClose: vi.fn(),
    onSend: vi.fn(),
  };
  return render(<ReviewSheet {...defaults} {...props} />);
}

describe('ReviewSheet', () => {
  it('renders nothing when open is false', () => {
    const { container } = renderReview({ open: false });
    expect(container.innerHTML).toBe('');
  });

  it('renders heading and location info', () => {
    renderReview();
    expect(screen.getByText('Review remedial')).toBeInTheDocument();
    expect(screen.getByText('Test Dev')).toBeInTheDocument();
    expect(screen.getByText('Test Site')).toBeInTheDocument();
    expect(screen.getByText('P123')).toBeInTheDocument();
  });

  it('renders filled items with description and quantity', () => {
    renderReview();
    expect(screen.getByText('Hinge')).toBeInTheDocument();
    expect(screen.getByText('× 2')).toBeInTheDocument();
    expect(screen.getByText('Damaged on Arrival')).toBeInTheDocument();
  });

  it('shows SAP code when item has sap_code', () => {
    renderReview({
      items: [{ description: 'D600L door', quantity: 1, reason: 'missing_omission', sap_code: 'D600L' }],
    });
    expect(screen.getByText('D600L')).toBeInTheDocument();
  });

  it('shows delivery label', () => {
    renderReview({ deliveryType: 'next_delivery' });
    expect(screen.getByText('Next delivery')).toBeInTheDocument();
  });

  it('shows specific date when set', () => {
    renderReview({ deliveryType: 'specific_date', deliveryDate: '2026-06-20' });
    expect(screen.getByText('2026-06-20')).toBeInTheDocument();
  });

  it('shows photo count', () => {
    renderReview({ photoCount: 3 });
    expect(screen.getByText('3 photos')).toBeInTheDocument();
  });

  it('shows "Send to office" button', () => {
    renderReview();
    expect(screen.getByText('Send to office')).toBeInTheDocument();
  });

  it('shows "Back to edit" button', () => {
    renderReview();
    expect(screen.getByText('Back to edit')).toBeInTheDocument();
  });

  it('calls onClose when "Back to edit" is clicked', async () => {
    const onClose = vi.fn();
    renderReview({ onClose });
    const user = userEvent.setup();
    await user.click(screen.getByText('Back to edit'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    renderReview({ onClose });
    const user = userEvent.setup();
    await user.click(screen.getByText('Review remedial').closest('.fixed')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSend when "Send to office" is clicked', async () => {
    const onSend = vi.fn();
    renderReview({ onSend });
    const user = userEvent.setup();
    await user.click(screen.getByText('Send to office'));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('sends button is disabled when submitting', () => {
    renderReview({ submitting: true });
    expect(screen.getByText('Sending…')).toBeDisabled();
  });

  describe('issues list', () => {
    it('shows missing developer issue', () => {
      renderReview({ developer: '' });
      expect(screen.getByText(/Developer is empty/)).toBeInTheDocument();
    });

    it('shows missing site issue', () => {
      renderReview({ site: '' });
      expect(screen.getByText(/Site is empty/)).toBeInTheDocument();
    });

    it('shows missing plot issue', () => {
      renderReview({ plot: '' });
      expect(screen.getByText(/Plot number is empty/)).toBeInTheDocument();
    });

    it('shows missing items issue', () => {
      renderReview({ items: [] });
      expect(screen.getByText(/need at least one/)).toBeInTheDocument();
    });

    it('shows delivery type issue', () => {
      renderReview({ deliveryType: '' });
      expect(screen.getByText(/Delivery preference not set/)).toBeInTheDocument();
    });

    it('shows date issue for specific_date without date', () => {
      renderReview({ deliveryType: 'specific_date', deliveryDate: '' });
      expect(screen.getByText(/Delivery date not picked/)).toBeInTheDocument();
    });

    it('sends button is disabled when issues exist', () => {
      renderReview({ developer: '', site: '', plot: '' });
      expect(screen.getByText('Send to office')).toBeDisabled();
    });

    it('renders all issues together', () => {
      renderReview({ developer: '', site: '', plot: '', items: [], deliveryType: '' });
      expect(screen.getByText('Before sending')).toBeInTheDocument();
      expect(screen.getByText(/Developer is empty/)).toBeInTheDocument();
      expect(screen.getByText(/Site is empty/)).toBeInTheDocument();
      expect(screen.getByText(/Plot number is empty/)).toBeInTheDocument();
      expect(screen.getByText(/need at least one/)).toBeInTheDocument();
      expect(screen.getByText(/Delivery preference not set/)).toBeInTheDocument();
    });
  });
});
