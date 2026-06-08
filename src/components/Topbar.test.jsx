import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/index.jsx';
import { Topbar } from './Topbar.jsx';

const baseProps = {
  lang: 'ps',
  theme: 'dark',
  query: '',
  user: { name: 'System Admin', roleLabel: 'System Administrator' },
  onLangChange: vi.fn(),
  onThemeToggle: vi.fn(),
  onQueryChange: vi.fn(),
  onSearchSubmit: vi.fn(),
  onToggleSidebar: vi.fn()
};

function renderTopbar(props = {}) {
  const merged = { ...baseProps, ...props };
  render(
    <I18nProvider lang="en">
      <Topbar {...merged} />
    </I18nProvider>
  );
  return merged;
}

describe('Topbar interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets users type a query and submit with Enter', () => {
    const props = renderTopbar();
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '8.8.8.8' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(props.onQueryChange).toHaveBeenCalledWith('8.8.8.8');
    expect(props.onSearchSubmit).toHaveBeenCalledTimes(1);
  });

  it('submits search when the search icon button is clicked', () => {
    const props = renderTopbar({ query: '8.8.8.8' });

    fireEvent.click(screen.getByRole('button', { name: /search dashboard data/i }));

    expect(props.onSearchSubmit).toHaveBeenCalledTimes(1);
  });

  it('wires language, theme, and sidebar buttons', () => {
    const props = renderTopbar();

    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    expect(props.onLangChange).toHaveBeenCalledWith('en');
    expect(props.onThemeToggle).toHaveBeenCalledTimes(1);
    expect(props.onToggleSidebar).toHaveBeenCalledTimes(1);
  });
});
