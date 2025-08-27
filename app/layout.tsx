import React from 'react';
import './globals.css';

export const metadata = {
    title: 'Gemini 2.5 Flash Image — Fusion Demo',
    description: 'Upload a base scene and a product image, add instructions, and generate a fused image.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
