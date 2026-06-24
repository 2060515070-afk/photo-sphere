import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "记忆碎片 - Photo Sphere",
  description: "3D 照片记忆空间，用漂浮的方式重温每一张照片",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="bg-particles" />
        <nav className="navbar">
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: '1.5rem' }}>✦</span>
            <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em' }}>
              记忆碎片
            </span>
          </a>
          <div style={{ flex: 1 }} />
          <a
            href="/upload"
            style={{
              padding: '8px 16px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '10px',
              color: '#a5b4fc',
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            + 上传照片
          </a>
        </nav>
        <main style={{ paddingTop: '64px', position: 'relative', zIndex: 1 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
