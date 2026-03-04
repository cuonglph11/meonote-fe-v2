/**
 * Settings Tests — 7 cases
 *
 * TC-S1: Verify view terms of service / privacy policy opens correctly
 * TC-S2: Verify change language successful
 * TC-S3: Verify change UI mode successful (light/dark/system)
 * TC-S4: Verify anonymous token displayed (truncated format)
 * TC-S5: Verify app version displayed correctly
 * TC-S6: Verify clear data → confirm → reset app (clear token, notes, prefs) → reload
 * TC-S7: Verify cancel clear data → nothing happens
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/features/settings/hooks/useSettings');

import { useSettings } from '@/features/settings/hooks/useSettings';
import { SettingsModal } from '@/features/settings/components/SettingsModal';

const mockSetLanguage = jest.fn();
const mockSetTheme = jest.fn();
const mockClearAllData = jest.fn();
const mockOnClose = jest.fn();

const userToken = 'abcd1234-5678-90ef-ghij-klmnopqrstuv';
const truncated = `${userToken.substring(0, 8)}...${userToken.substring(userToken.length - 4)}`;

function setupMocks() {
  (useSettings as jest.Mock).mockReturnValue({
    settings: { theme: 'light', language: 'en', onboardingCompleted: true },
    userToken,
    setTheme: mockSetTheme,
    setLanguage: mockSetLanguage,
    completeOnboarding: jest.fn(),
    clearAllData: mockClearAllData,
  });
}

function renderSettingsModal(isOpen = true) {
  setupMocks();
  return render(
    <MemoryRouter>
      <SettingsModal isOpen={isOpen} onClose={mockOnClose} />
    </MemoryRouter>
  );
}

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * TC-S1: Verify view terms of service / privacy policy opens correctly
   */
  it('TC-S1: clicking Terms of Service shows legal modal with iframe', async () => {
    renderSettingsModal();

    const termsItem = screen.getByTestId('settings-terms-item');
    fireEvent.click(termsItem);

    await waitFor(() => {
      expect(screen.getByTestId('legal-iframe')).toBeInTheDocument();
    });

    // Privacy policy
    setupMocks();
  });

  it('TC-S1b: clicking Privacy Policy shows legal modal with iframe', async () => {
    renderSettingsModal();

    const privacyItem = screen.getByTestId('settings-privacy-item');
    fireEvent.click(privacyItem);

    await waitFor(() => {
      expect(screen.getByTestId('legal-iframe')).toBeInTheDocument();
    });
  });

  /**
   * TC-S2: Verify change language successful
   */
  it('TC-S2: changing language calls setLanguage with selected value', async () => {
    renderSettingsModal();

    const languageSelect = screen.getByTestId('settings-language-select');
    fireEvent.change(languageSelect, { target: { value: 'vi' } });

    expect(mockSetLanguage).toHaveBeenCalledWith('vi');
  });

  /**
   * TC-S3: Verify change UI mode successful (light/dark/system)
   */
  it('TC-S3: changing theme calls setTheme with selected value', async () => {
    renderSettingsModal();

    const themeSelect = screen.getByTestId('settings-theme-select');

    // Light
    fireEvent.change(themeSelect, { target: { value: 'dark' } });
    expect(mockSetTheme).toHaveBeenCalledWith('dark');

    fireEvent.change(themeSelect, { target: { value: 'system' } });
    expect(mockSetTheme).toHaveBeenCalledWith('system');

    fireEvent.change(themeSelect, { target: { value: 'light' } });
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  /**
   * TC-S4: Verify anonymous token displayed (truncated format)
   */
  it('TC-S4: displays truncated user token', () => {
    renderSettingsModal();

    const tokenDisplay = screen.getByTestId('settings-userid-value');
    expect(tokenDisplay).toHaveTextContent(truncated);
    // Should not show full token
    expect(tokenDisplay).not.toHaveTextContent(userToken);
  });

  /**
   * TC-S5: Verify app version displayed correctly
   */
  it('TC-S5: displays app version', () => {
    renderSettingsModal();

    const versionDisplay = screen.getByTestId('settings-version-value');
    expect(versionDisplay).toBeInTheDocument();
    // Version should be a non-empty string
    expect(versionDisplay.textContent).toBeTruthy();
  });

  /**
   * TC-S6: Verify clear data → confirm → reset app → reload
   */
  it('TC-S6: clear data confirmation calls clearAllData', async () => {
    renderSettingsModal();

    const clearButton = screen.getByTestId('settings-clear-data-button');
    fireEvent.click(clearButton);

    const alert = await screen.findByTestId('clear-data-alert');
    expect(alert).toBeInTheDocument();

    // Click confirm
    const confirmBtn = screen.getByText('settings.clearData');
    fireEvent.click(confirmBtn);

    expect(mockClearAllData).toHaveBeenCalled();
  });

  /**
   * TC-S7: Verify cancel clear data → nothing happens
   */
  it('TC-S7: canceling clear data does not call clearAllData', async () => {
    renderSettingsModal();

    const clearButton = screen.getByTestId('settings-clear-data-button');
    fireEvent.click(clearButton);

    await screen.findByTestId('clear-data-alert');

    // Click cancel
    const cancelBtn = screen.getByText('common.cancel');
    fireEvent.click(cancelBtn);

    expect(mockClearAllData).not.toHaveBeenCalled();
  });
});
