import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LineItemSheet from '../components/LineItemSheet';
import type { KitchenItem } from '../components/KitchenPicker';
import type { LineItemInput } from '@shared/types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const blankItem: LineItemInput = { description: '', quantity: 1, reason: '' };
const filledItem: LineItemInput = { description: 'Test item', quantity: 2, reason: 'damaged_on_arrival' };
const kitchenItem: LineItemInput = { description: 'Cabinet door 600L', quantity: 1, reason: '', sap_code: 'D600L' };

const kitchenItems: KitchenItem[] = [
  { salesDoc: 'S1', salesType: null, sapCode: 'D600L', description: 'Cabinet door 600L', quantity: 1, poNumber: null, plot: null },
  { salesDoc: 'S1', salesType: null, sapCode: 'BW600R', description: 'Base wall unit 600R', quantity: 2, poNumber: null, plot: null },
];

function renderSheet(props: Partial<{
  index: number;
  initial: LineItemInput;
  canDelete: boolean;
  kitchenItems: KitchenItem[] | undefined;
  onSave: (item: LineItemInput) => void;
  onDelete: () => void;
  onClose: () => void;
}> = {}) {
  const defaults = {
    index: 0,
    initial: blankItem,
    canDelete: true,
    kitchenItems: undefined,
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
  };
  return render(<LineItemSheet {...defaults} {...props} />);
}

describe('LineItemSheet', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
  });

  describe('header', () => {
    it('renders editor header with item number', () => {
      renderSheet({ index: 1 });
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('renders close button that calls onClose', async () => {
      const onClose = vi.fn();
      renderSheet({ onClose });
      const user = userEvent.setup();
      await user.click(screen.getByText('×'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose on Escape key', async () => {
      const onClose = vi.fn();
      renderSheet({ onClose });
      const user = userEvent.setup();
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('blank item (manual entry)', () => {
    it('shows description typeahead', () => {
      renderSheet();
      expect(screen.getByPlaceholderText('e.g. Soft close hinge')).toBeInTheDocument();
    });

    it('shows "Pick from kitchen" button when kitchen items are available', () => {
      renderSheet({ kitchenItems });
      expect(screen.getByText('Pick from kitchen')).toBeInTheDocument();
    });

    it('hides "Pick from kitchen" when kitchen items array is empty', () => {
      renderSheet({ kitchenItems: [] });
      expect(screen.queryByText('Pick from kitchen')).not.toBeInTheDocument();
    });

    it('hides "Pick from kitchen" after item has description', async () => {
      renderSheet({ kitchenItems });
      const user = userEvent.setup();
      const descInput = screen.getByPlaceholderText('e.g. Soft close hinge');
      await user.type(descInput, 'Something');
      expect(screen.queryByText('Pick from kitchen')).not.toBeInTheDocument();
    });

    it('shows inline kitchen picker when "Pick from kitchen" is clicked', async () => {
      renderSheet({ kitchenItems });
      const user = userEvent.setup();
      await user.click(screen.getByText('Pick from kitchen'));
      await waitFor(() => {
        expect(screen.getByText('D600L')).toBeInTheDocument();
        expect(screen.getByText('BW600R')).toBeInTheDocument();
      });
    });

    it('fills item when kitchen item is picked from inline picker', async () => {
      const onSave = vi.fn();
      renderSheet({ kitchenItems, onSave });
      const user = userEvent.setup();
      await user.click(screen.getByText('Pick from kitchen'));
      await screen.findByText('D600L');
      await user.click(screen.getByText('D600L'));
      await waitFor(() => {
        expect(screen.queryByText('Pick from kitchen')).not.toBeInTheDocument();
      });
      const descInput = screen.getByPlaceholderText('e.g. Soft close hinge');
      expect(descInput).toHaveValue('Cabinet door 600L');
    });

    it('filters kitchen items by search query', async () => {
      renderSheet({ kitchenItems });
      const user = userEvent.setup();
      await user.click(screen.getByText('Pick from kitchen'));
      await screen.findByText('D600L');
      const searchInput = screen.getByPlaceholderText('Search kitchen items…');
      await user.type(searchInput, 'BW');
      expect(screen.getByText('BW600R')).toBeInTheDocument();
      expect(screen.queryByText('D600L')).not.toBeInTheDocument();
    });

    it('shows no match message when filter returns empty', async () => {
      renderSheet({ kitchenItems });
      const user = userEvent.setup();
      await user.click(screen.getByText('Pick from kitchen'));
      await screen.findByText('D600L');
      const searchInput = screen.getByPlaceholderText('Search kitchen items…');
      await user.type(searchInput, 'zzz');
      expect(screen.getByText(/No items match/)).toBeInTheDocument();
    });

    it('cancels kitchen picker and returns to blank state', async () => {
      renderSheet({ kitchenItems });
      const user = userEvent.setup();
      await user.click(screen.getByText('Pick from kitchen'));
      await screen.findByText('D600L');
      await user.click(screen.getByText('Cancel'));
      expect(screen.queryByPlaceholderText('Search kitchen items…')).not.toBeInTheDocument();
      expect(screen.getByText('Pick from kitchen')).toBeInTheDocument();
    });
  });

  describe('kitchen-picked item', () => {
    it('shows "From kitchen" badge with SAP code', () => {
      renderSheet({ initial: kitchenItem });
      expect(screen.getByText('From kitchen')).toBeInTheDocument();
      expect(screen.getByText(/D600L/)).toBeInTheDocument();
    });

    it('hides description typeahead', () => {
      renderSheet({ initial: kitchenItem });
      expect(screen.queryByPlaceholderText('e.g. Soft close hinge')).not.toBeInTheDocument();
    });

    it('hides "Pick from kitchen" button', () => {
      renderSheet({ initial: kitchenItem, kitchenItems });
      expect(screen.queryByText('Pick from kitchen')).not.toBeInTheDocument();
    });

    it('shows "Add a note" button', () => {
      renderSheet({ initial: kitchenItem });
      expect(screen.getByText('+ Add a note (optional)')).toBeInTheDocument();
    });

    it('shows note textarea after clicking "Add a note"', async () => {
      renderSheet({ initial: kitchenItem });
      const user = userEvent.setup();
      await user.click(screen.getByText('+ Add a note (optional)'));
      expect(screen.getByPlaceholderText(/extra detail/)).toBeInTheDocument();
    });
  });

  describe('subset picker', () => {
    it('shows "Only need part of this unit?" for kitchen items', () => {
      renderSheet({ initial: kitchenItem, kitchenItems });
      expect(screen.getByText('Only need part of this unit?')).toBeInTheDocument();
    });

    it('does not show subset picker when no kitchen items available', () => {
      renderSheet({ initial: kitchenItem });
      expect(screen.queryByText('Only need part of this unit?')).not.toBeInTheDocument();
    });

    it('expands on click', async () => {
      renderSheet({ initial: kitchenItem, kitchenItems });
      const user = userEvent.setup();
      await user.click(screen.getByText('Only need part of this unit?'));
      const chips = screen.getAllByText('Full unit');
      expect(chips.length).toBeGreaterThanOrEqual(1);
    });

    it('collapses when header is clicked', async () => {
      renderSheet({ initial: kitchenItem, kitchenItems });
      const user = userEvent.setup();
      await user.click(screen.getByText('Only need part of this unit?'));
      await screen.findByText('What do you need?');
      await user.click(screen.getByText('What do you need?'));
      expect(screen.queryByText('What do you need?')).not.toBeInTheDocument();
      expect(screen.getByText('Only need part of this unit?')).toBeInTheDocument();
    });
  });

  describe('quantity', () => {
    it('renders with initial quantity', () => {
      renderSheet({ initial: filledItem });
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveValue(2);
    });

    it('increments on + click', async () => {
      renderSheet();
      const user = userEvent.setup();
      await user.click(screen.getByText('+'));
      expect(screen.getByRole('spinbutton')).toHaveValue(2);
    });

    it('decrements on − click', async () => {
      renderSheet({ initial: { ...blankItem, quantity: 3 } });
      const user = userEvent.setup();
      await user.click(screen.getByText('−'));
      expect(screen.getByRole('spinbutton')).toHaveValue(2);
    });

    it('does not decrement below 1', async () => {
      renderSheet();
      const user = userEvent.setup();
      await user.click(screen.getByText('−'));
      expect(screen.getByRole('spinbutton')).toHaveValue(1);
    });
  });

  describe('reason', () => {
    it('renders all reason chips', () => {
      renderSheet();
      expect(screen.getByText('Damaged on Arrival')).toBeInTheDocument();
      expect(screen.getByText('Missing / Omission')).toBeInTheDocument();
      expect(screen.getByText('Wrong Specification')).toBeInTheDocument();
      expect(screen.getByText('Site Loss')).toBeInTheDocument();
    });

    it('selects a reason chip on click', async () => {
      renderSheet();
      const user = userEvent.setup();
      await user.click(screen.getByText('Wrong Specification'));
      const chip = screen.getByText('Wrong Specification');
      expect(chip.className).toContain('bg-stone-800');
    });
  });

  describe('save button', () => {
    it('is disabled when reason is empty', () => {
      renderSheet();
      expect(screen.getByText('Save')).toBeDisabled();
    });

    it('is disabled when quantity is 0', async () => {
      const onSave = vi.fn();
      renderSheet({ onSave });
      const user = userEvent.setup();
      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '0');
      await user.click(screen.getByText('Wrong Specification'));
      expect(screen.getByText('Save')).toBeDisabled();
    });

    it('is enabled when description and reason are filled for manual items', async () => {
      renderSheet();
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText('e.g. Soft close hinge'), 'Test item');
      await user.click(screen.getByText('Damaged on Arrival'));
      expect(screen.getByText('Save')).not.toBeDisabled();
    });

    it('is enabled for kitchen items with just a reason', async () => {
      renderSheet({ initial: kitchenItem });
      const user = userEvent.setup();
      await user.click(screen.getByText('Site Loss'));
      expect(screen.getByText('Save')).not.toBeDisabled();
    });

    it('calls onSave with correct data', async () => {
      const onSave = vi.fn();
      renderSheet({ onSave });
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText('e.g. Soft close hinge'), 'New hinge');
      await user.click(screen.getByText('Missing / Omission'));
      await user.click(screen.getByText('Save'));
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({
        description: 'New hinge',
        quantity: 1,
        reason: 'missing_omission',
      });
    });

    it('calls onSave with sap_code when set', async () => {
      const onSave = vi.fn();
      renderSheet({ initial: kitchenItem, onSave });
      const user = userEvent.setup();
      await user.click(screen.getByText('Missing / Omission'));
      await user.click(screen.getByText('Save'));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ sap_code: 'D600L', reason: 'missing_omission' })
      );
    });
  });

  describe('delete button', () => {
    it('shows when canDelete is true', () => {
      renderSheet({ canDelete: true });
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('hides when canDelete is false', () => {
      renderSheet({ canDelete: false });
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('calls onDelete when clicked', async () => {
      const onDelete = vi.fn();
      renderSheet({ onDelete });
      const user = userEvent.setup();
      await user.click(screen.getByText('Delete'));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });
});
