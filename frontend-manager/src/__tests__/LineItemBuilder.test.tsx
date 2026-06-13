import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LineItemBuilder from '../components/LineItemBuilder';
import type { LineItemInput } from '@shared/types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const blankRow: LineItemInput = { description: '', quantity: 1, reason: '' };
const filledRow: LineItemInput = { description: 'Soft close hinge', quantity: 3, reason: 'damaged_on_arrival' };

describe('LineItemBuilder', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
  });

  function renderBuilder(props: Partial<{
    items: LineItemInput[];
    onChange: (items: LineItemInput[]) => void;
    disabled: boolean;
    openIndex: number | null;
    onOpenIndexChange: (idx: number | null) => void;
    kitchenItems: undefined;
  }> = {}) {
    const defaults = {
      items: [blankRow],
      onChange: vi.fn(),
      disabled: false,
    };
    return render(<LineItemBuilder {...defaults} {...props} />);
  }

  it('renders item rows', () => {
    renderBuilder();
    expect(screen.getByText('ITEM 1')).toBeInTheDocument();
  });

  it('shows "Tap to add" for empty rows', () => {
    renderBuilder({ items: [blankRow] });
    expect(screen.getByText('Tap to add')).toBeInTheDocument();
  });

  it('shows "Edit" for filled rows', () => {
    renderBuilder({ items: [filledRow] });
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('shows SAP code and description for filled rows with sap_code', () => {
    renderBuilder({
      items: [{ description: 'Cabinet door', quantity: 1, reason: 'missing_omission', sap_code: 'D600L' }],
    });
    expect(screen.getByText(/D600L/)).toBeInTheDocument();
  });

  it('shows description and quantity for filled rows without sap_code', () => {
    renderBuilder({ items: [filledRow] });
    expect(screen.getByText(/× 3/)).toBeInTheDocument();
    expect(screen.getByText('Soft close hinge')).toBeInTheDocument();
  });

  it('shows "Add Another Item" button', () => {
    renderBuilder();
    expect(screen.getByText('+ Add Another Item')).toBeInTheDocument();
  });

  it('adds another row when "Add Another Item" is clicked', async () => {
    const onChange = vi.fn();
    renderBuilder({ onChange });
    const user = userEvent.setup();
    await user.click(screen.getByText('+ Add Another Item'));
    expect(onChange).toHaveBeenCalledWith([blankRow, { description: '', quantity: 1, reason: '' }]);
  });

  it('opens editor when a row is clicked', async () => {
    renderBuilder();
    const user = userEvent.setup();
    await user.click(screen.getByText('Tap to add'));
    await waitFor(() => {
      expect(screen.getByText(/Item 1/)).toBeInTheDocument();
    });
  });

  it('closes editor on save', async () => {
    const onChange = vi.fn();
    renderBuilder({ onChange });
    const user = userEvent.setup();
    await user.click(screen.getByText('Tap to add'));
    await screen.findByText(/Item 1/);
    const descInput = screen.getByPlaceholderText('e.g. Soft close hinge');
    await user.type(descInput, 'Test item');
    await user.click(screen.getByText('Missing / Omission'));
    await user.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });

  it('closes editor when onClose is triggered', async () => {
    renderBuilder();
    const user = userEvent.setup();
    await user.click(screen.getByText('Tap to add'));
    await screen.findByText(/Item 1/);
    await user.click(screen.getByText('×'));
    await waitFor(() => {
      expect(screen.queryByText(/Item 1/)).not.toBeInTheDocument();
    });
  });

  it('deletes a row when delete is clicked in editor (with multiple rows)', async () => {
    const onChange = vi.fn();
    renderBuilder({ items: [blankRow, blankRow], onChange });
    const user = userEvent.setup();
    const firstTap = screen.getAllByText('Tap to add')[0];
    await user.click(firstTap);
    await screen.findByText('Delete');
    await user.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      const call = onChange.mock.calls[0][0] as LineItemInput[];
      expect(call.length).toBe(1);
    });
  });
});
