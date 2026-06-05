import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhonePage } from './Phone.jsx';

vi.mock('../lib/numverify.js', () => ({
  validatePhoneWithNumverify: vi.fn(async () => ({
    enabled: true,
    valid: true,
    number: '14158586273',
    internationalFormat: '+14158586273',
    localFormat: '4158586273',
    countryCode: 'US',
    countryName: 'United States of America',
    carrier: 'AT&T Mobility LLC',
    lineType: 'mobile',
    location: ''
  }))
}));

describe('PhonePage Numverify result card', () => {
  it('shows all Numverify fields in Pashto and keeps English details in technical details', async () => {
    render(<PhonePage warrant={{ number: 'W-1' }} onClassify={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('+93 700 000 000'), { target: { value: '+14158586273' } });
    fireEvent.click(screen.getByRole('button', { name: /طبقه بندي/i }));

    await waitFor(() => expect(screen.getByText('د امریکا متحده ایالات')).toBeInTheDocument());
    expect(screen.getByText('د هېواد کوډ:')).toBeInTheDocument();
    expect(screen.getAllByText('US').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+14158586273').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4158586273').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AT&T Mobility LLC').length).toBeGreaterThan(0);
    expect(screen.getByText('موبایل')).toBeInTheDocument();
    expect(screen.getByText('معتبره')).toBeInTheDocument();
    expect(screen.getByText('د دې شمېرې لپاره د موقعیت معلومات د Numverify API لخوا نه ورکول کېږي.')).toBeInTheDocument();
    expect(screen.getByText('تخنیکي جزئیات')).toBeInTheDocument();
    expect(screen.getByText('United States of America')).toBeInTheDocument();
    expect(screen.getByText('mobile')).toBeInTheDocument();
  });
});
