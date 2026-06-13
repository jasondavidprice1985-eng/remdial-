import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormSection, { CompleteTag } from '../components/FormSection';

describe('FormSection', () => {
  it('renders label and children', () => {
    render(<FormSection label="Where?"><p>child content</p></FormSection>);
    expect(screen.getByText('Where?')).toBeInTheDocument();
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('renders step number with eyebrow', () => {
    render(<FormSection step={2} eyebrow="What" label="What's needed?"><div /></FormSection>);
    expect(screen.getByText(/02/)).toBeInTheDocument();
    expect(screen.getByText("What's needed?")).toBeInTheDocument();
  });

  it('renders CompletedTag when done=true', () => {
    render(<FormSection label="Where?" aux={<CompleteTag done />}><div /></FormSection>);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('renders Optional text when done=false and no label', () => {
    render(<FormSection label="Photos" aux={<CompleteTag />}><div /></FormSection>);
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('renders custom label when done=false and label provided', () => {
    render(<FormSection label="Items" aux={<CompleteTag label="0 items" />}><div /></FormSection>);
    expect(screen.getByText('0 items')).toBeInTheDocument();
  });

  it('does not render step or eyebrow when omitted', () => {
    const { container } = render(<FormSection label="Just a label"><div /></FormSection>);
    expect(container.querySelector('.font-mono')).toBeFalsy();
  });
});
