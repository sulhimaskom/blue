'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export type ThemeOption = 'light' | 'dark' | 'system';

export interface ThemeSelectorProps {
  initialTheme?: ThemeOption;
  onSave?: (_theme: ThemeOption) => Promise<void>;
  disabled?: boolean;
}

export const ThemeSelector = React.memo(function ThemeSelectorComponent({
  initialTheme = 'system',
  onSave,
  disabled = false,
}: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(initialTheme);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const themes: { value: ThemeOption; label: string; description: string }[] = [
    {
      value: 'light',
      label: 'Light',
      description: 'Always use light theme',
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Always use dark theme',
    },
    {
      value: 'system',
      label: 'System',
      description: 'Follow your system preferences',
    },
  ];

  const handleSave = async () => {
    if (!onSave) return;

    setLoading(true);
    setMessage(null);

    try {
      await onSave(selectedTheme);
      setMessage({ type: 'success', text: 'Theme preference saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save theme preference. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Theme Preference</h3>
        <p className="mt-1 text-sm text-gray-600">
          Choose your preferred theme for the application interface.
        </p>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {themes.map(theme => (
          <button
            key={theme.value}
            type="button"
            onClick={() => setSelectedTheme(theme.value)}
            disabled={disabled || loading}
            className={cn(
              'relative flex flex-col items-start p-4 border-2 rounded-lg transition-all hover:scale-[1.01]',
              selectedTheme === theme.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              (disabled || loading) && 'opacity-50 cursor-not-allowed'
            )}
            aria-pressed={selectedTheme === theme.value}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2',
                    selectedTheme === theme.value
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  )}
                  aria-hidden="true"
                >
                  {selectedTheme === theme.value && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                  )}
                </div>
                <span className="font-medium text-gray-900">{theme.label}</span>
              </div>
              {selectedTheme === theme.value && (
                <span className="text-blue-500" aria-hidden="true">
                  ✓
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">{theme.description}</p>
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={disabled || loading} loading={loading}>
          Save Theme Preference
        </Button>
      </div>
    </div>
  );
});

ThemeSelector.displayName = 'ThemeSelector';
