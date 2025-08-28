import React from 'react';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
    title: {
        default: 'Photofusion',
        template: 'Photofusion — %s',
    },
    description:
        'A simple tool for designers and small businesses to generate product shots.',
    keywords: [
        'Image Fusion',
        'Product on Model',
        'AI Image',
        'Gemini',
        'Generative AI',
        'E-commerce',
        'Mockup',
        'Next.js',
    ],
    applicationName: 'Photofusion',
    authors: [{ name: 'Darshan Parmar' }],
    creator: 'Darshan Parmar',
    publisher: 'Photofusion',
    openGraph: {
        title: 'Photofusion',
        description:
            'A simple tool for designers and small businesses to generate product shots.',
        url: '/',
        siteName: 'Photofusion',
        images: [
            {
                url: 'https://raw.githubusercontent.com/darshankparmar/ImageFusion/main/vercel-next/images/result.png',
                width: 1200,
                height: 630,
                alt: 'Photofusion preview image',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Photofusion',
        description:
            'A simple tool for designers and small businesses to generate product shots.',
        images: [
            'https://raw.githubusercontent.com/darshankparmar/ImageFusion/main/vercel-next/images/result.png',
        ],
    },
    category: 'technology',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
    alternates: {
        canonical: '/',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                {children}
                <Analytics />
                <GoogleAnalytics gaId="G-SG77GRLFST" />
            </body>
        </html>
    );
}
