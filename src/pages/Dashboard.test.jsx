import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard.jsx';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div />,
  CircleMarker: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>
}));

describe('Dashboard IPinfo result panel', () => {
  it('renders live lookup results returned by the secure backend endpoint', () => {
    render(
      <Dashboard
        cases={[]}
        trafficData={[]}
        alerts={[]}
        dataLoading={false}
        ipLookup={{
          loading: false,
          error: '',
          result: {
            ip: '8.8.8.8',
            city: 'Mountain View',
            region: 'California',
            country: 'US',
            org: 'AS15169 Google LLC',
            privacy: { vpn: false, proxy: false, tor: false }
          }
        }}
        onDismissAlert={() => {}}
        onFaceCheck={() => {}}
      />
    );

    expect(screen.getByText('IPinfo lookup')).toBeInTheDocument();
    expect(screen.getByText('8.8.8.8')).toBeInTheDocument();
    expect(screen.getByText(/Mountain View, California, US/)).toBeInTheDocument();
    expect(screen.getByText(/AS15169 Google LLC/)).toBeInTheDocument();
    expect(screen.getByText('No VPN signal')).toBeInTheDocument();
  });
});
