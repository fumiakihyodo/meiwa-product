// app/layout.tsx
'use client';

import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { theme } from './theme';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <title>アカウント管理システム</title>
        <meta name="description" content="ユーザーアカウント管理システム" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '8px',
                  padding: '12px 16px',
                },
                success: {
                  style: {
                    background: '#4caf50',
                    color: 'white',
                  },
                  iconTheme: {
                    primary: 'white',
                    secondary: '#4caf50',
                  },
                },
                error: {
                  style: {
                    background: '#f44336',
                    color: 'white',
                  },
                  iconTheme: {
                    primary: 'white',
                    secondary: '#f44336',
                  },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}