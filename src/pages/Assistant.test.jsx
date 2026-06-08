import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Assistant } from './Assistant.jsx';

describe('AI Assistant page', () => {
  it('renders without crashing and never performs automatic actions', () => {
    const onApprovalRequest = vi.fn();

    render(
      <Assistant
        warrant={{ accessStartTime: '2026-06-08T08:00:00Z', accessEndTime: '2026-06-08T18:00:00Z' }}
        auditLog={[]}
        alerts={[]}
        statusRows={[]}
        onApprovalRequest={onApprovalRequest}
      />
    );

    expect(screen.getByText('Permission-first AI Assistant')).toBeInTheDocument();
    expect(screen.getByText(/AI Assistant is temporarily unavailable/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

    expect(screen.getByText(/Automatic action:/)).toBeInTheDocument();
    expect(screen.getByText(/Not allowed/)).toBeInTheDocument();
    expect(screen.getByText(/Required permissions:/)).toBeInTheDocument();
    expect(onApprovalRequest).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Request administrator approval/i }));

    expect(onApprovalRequest).toHaveBeenCalledTimes(1);
  });
});
