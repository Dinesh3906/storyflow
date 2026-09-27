import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StoryFlow — Realtime Voice-Driven AI Writing Studio',
  description: 'Speak your story naturally into your microphone and watch it become clean written prose live in the browser.',
  keywords: ['storytelling', 'speech to text', 'realtime writing', 'screenplay', 'poetry', 'teluglish', 'hinglish'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
