import { render, screen } from '@testing-library/react';
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

describe('MapPage live province records', () => {
  it('renders heatmap rows from live Supabase traffic records only', () => {
    renderMap(
      <MapPage
        points={[
          {
            id: 'traffic-kabul-1',
            region: 'Kabul',
            city: 'Kabul',
            loc: [34.5553, 69.2075],
            risk: 'high'
          },
          {
            id: 'traffic-kabul-2',
            region: 'Kabul',
            city: 'Kabul',
            loc: [34.5553, 69.2075],
            risk: 'medium'
          },
          {
            id: 'traffic-herat-1',
            region: 'Herat',
            city: 'Herat',
            loc: [34.3529, 62.204],
            risk: 'normal'
          }
        ]}
      />
    );

    expect(screen.getByRole('button', { name: /Kabul \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Herat \(1\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load Demo Data/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/TEST DATA/i)).not.toBeInTheDocument();
  });
});
