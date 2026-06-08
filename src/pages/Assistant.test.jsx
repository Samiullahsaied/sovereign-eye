import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Assistant } from './Assistant.jsx';

const activeWarrant = {
  accessStartTime: '2026-06-08T08:00:00Z',
  accessEndTime: '2026-06-08T18:00:00Z'
};

describe('AI Assistant page', () => {
  it('renders operational analysis without performing automatic actions', () => {
    const onApprovalRequest = vi.fn();

    render(
      <Assistant
        warrant={activeWarrant}
        cases={[{ id: 'case-1', title: 'Authorized case' }]}
        auditLog={[{ id: 'audit-1', action: 'Login', detail: 'Operator login', time: '2026-06-08 08:00' }]}
        evidence={[{ id: 'evidence-1', action: 'Evidence note', detail: 'Reviewed file', time: '2026-06-08 08:10' }]}
        alerts={[{ id: 'alert-1', message: 'VPN alert', level: 'warn', createdAt: '2026-06-08 08:20' }]}
        sessions={[{ id: 'session-1', status: 'active', userAgent: 'Browser', startedAt: '2026-06-08 08:00' }]}
        deviceRecords={[{ id: 'device-1', name: 'Managed workstation' }]}
        typingProfiles={[{ id: 'typing-1', profileLabel: 'Keyboard cadence' }]}
        trafficData={[{ id: 'traffic-1', ip: '8.8.8.8', vpn: false }]}
        statusRows={[]}
        onApprovalRequest={onApprovalRequest}
      />
    );

    expect(screen.getByText('Operational AI Assistant')).toBeInTheDocument();
    expect(screen.getByText(/Permission-based operational analysis/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Run analysis/i }));

    expect(screen.getByText(/Confidence level:/)).toBeInTheDocument();
    expect(screen.getByText(/Evidence sources used/)).toBeInTheDocument();
    expect(screen.getByText(/Risk assessment:/)).toBeInTheDocument();
    expect(screen.getByText(/Recommended next steps/)).toBeInTheDocument();
    expect(screen.getByText(/Automatic action:/)).toBeInTheDocument();
    expect(screen.getByText(/Not allowed/)).toBeInTheDocument();
    expect(onApprovalRequest).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Request administrator approval/i }));

    expect(onApprovalRequest).toHaveBeenCalledTimes(1);
  });
});
