import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/index.jsx';
import { MapPage } from './MapPage.jsx';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div />,
  CircleMarker: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>
}));

function renderMap(ui) {
  return render(<I18nProvider lang="en">{ui}</I18nProvider>);
}

describe('MapPage demo province controls', () => {
  it('renders demo controls and marks seeded province rows as test data', () => {
    const onLoadDemoData = vi.fn();
    const onClearDemoData = vi.fn();

    renderMap(
      <MapPage
        points={[{
          id: 'demo-kabul',
          region: 'Kabul',
          city: 'Kabul',
          loc: [34.5553, 69.2075],
          risk: 'high',
          isTestData: true
        }]}
        onLoadDemoData={onLoadDemoData}
        onClearDemoData={onClearDemoData}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Load Demo Data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Demo Data' }));

    expect(onLoadDemoData).toHaveBeenCalledTimes(1);
    expect(onClearDemoData).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Showing Supabase TEST DATA because no real province records exist.')).toBeInTheDocument();
    expect(screen.getAllByText(/TEST DATA/).length).toBeGreaterThan(0);
  });

  it('hides demo rows when real Supabase province records exist', () => {
    renderMap(
      <MapPage
        points={[
          {
            id: 'demo-kabul',
            region: 'Kabul',
            city: 'Kabul',
            loc: [34.5553, 69.2075],
            risk: 'high',
            isTestData: true
          },
          {
            id: 'real-herat',
            region: 'Herat',
            city: 'Herat',
            loc: [34.3529, 62.204],
            risk: 'normal',
            isTestData: false
          }
        ]}
      />
    );

    expect(screen.getByText('Real Supabase records are available, so demo records are hidden.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Herat \(1\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kabul/ })).not.toBeInTheDocument();
  });
});
