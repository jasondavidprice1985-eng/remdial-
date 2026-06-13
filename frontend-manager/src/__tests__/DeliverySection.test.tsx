import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeliverySection from '../components/DeliverySection';

describe('DeliverySection', () => {
  it('renders both delivery type buttons', () => {
    render(<DeliverySection deliveryType="" deliveryDate="" onTypeChange={vi.fn()} onDateChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('Next Delivery')).toBeInTheDocument();
    expect(screen.getByText('Specific Date')).toBeInTheDocument();
  });

  it('highlights Next Delivery when selected', () => {
    render(<DeliverySection deliveryType="next_delivery" deliveryDate="" onTypeChange={vi.fn()} onDateChange={vi.fn()} disabled={false} />);
    const btn = screen.getByText('Next Delivery');
    expect(btn.className).toContain('bg-[var(--action)]');
  });

  it('highlights Specific Date when selected', () => {
    render(<DeliverySection deliveryType="specific_date" deliveryDate="" onTypeChange={vi.fn()} onDateChange={vi.fn()} disabled={false} />);
    const btn = screen.getByText('Specific Date');
    expect(btn.className).toContain('bg-[var(--action)]');
  });

  it('calls onTypeChange when Next Delivery is clicked', async () => {
    const onTypeChange = vi.fn();
    render(<DeliverySection deliveryType="" deliveryDate="" onTypeChange={onTypeChange} onDateChange={vi.fn()} disabled={false} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Next Delivery'));
    expect(onTypeChange).toHaveBeenCalledWith('next_delivery');
  });

  it('calls onTypeChange when Specific Date is clicked', async () => {
    const onTypeChange = vi.fn();
    render(<DeliverySection deliveryType="" deliveryDate="" onTypeChange={onTypeChange} onDateChange={vi.fn()} disabled={false} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Specific Date'));
    expect(onTypeChange).toHaveBeenCalledWith('specific_date');
  });

  it('shows date input when specific_date is selected', () => {
    render(<DeliverySection deliveryType="specific_date" deliveryDate="" onTypeChange={vi.fn()} onDateChange={vi.fn()} disabled={false} />);
    const dateInput = screen.getByDisplayValue('');
    expect(dateInput).toBeInTheDocument();
  });

  it('hides date input when next_delivery is selected', () => {
    render(<DeliverySection deliveryType="next_delivery" deliveryDate="" onTypeChange={vi.fn()} onDateChange={vi.fn()} disabled={false} />);
    expect(screen.queryByPlaceholderText('Select a date')).not.toBeInTheDocument();
  });

  it('calls onDateChange when date is selected', async () => {
    const onDateChange = vi.fn();
    render(<DeliverySection deliveryType="specific_date" deliveryDate="" onTypeChange={vi.fn()} onDateChange={onDateChange} disabled={false} />);
    const user = userEvent.setup();
    const dateInput = screen.getByDisplayValue('') as HTMLInputElement;
    await user.type(dateInput, '2026-06-20');
    expect(onDateChange).toHaveBeenCalled();
  });
});
