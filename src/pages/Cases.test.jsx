import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Cases } from './Cases.jsx';

describe('Cases page form', () => {
  it('validates required title before submit', () => {
    const onAddCase = vi.fn();
    render(<Cases cases={[]} query="" onAddCase={onAddCase} onRemoveCase={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /اضافه/i }));

    expect(onAddCase).not.toHaveBeenCalled();
    expect(screen.getByText('د قضیې نوم اړین دی.')).toBeInTheDocument();
  });

  it('keeps typed fields visible when Supabase save fails', async () => {
    const onAddCase = vi.fn(async () => false);
    render(<Cases cases={[]} query="" onAddCase={onAddCase} onRemoveCase={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('د قضیې نوم'), { target: { value: 'Case A' } });
    fireEvent.change(screen.getByPlaceholderText('نوم / شناسه'), { target: { value: 'Subject A' } });
    fireEvent.click(screen.getByRole('button', { name: /اضافه/i }));

    await waitFor(() => expect(screen.getByText(/could not be saved/i)).toBeInTheDocument());
    expect(screen.getByDisplayValue('Case A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Subject A')).toBeInTheDocument();
  });
});
