// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LiveOptionDataProvider } from "@/contexts/LiveOptionDataContext"; // We will move this file next

// Import your global SCSS styles
import "@/styles/globals.scss";

// This file contains the necessary Tailwind directives
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TradVed Strategy Visualizer",
  description: "Visualize complex options trading strategies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* The Provider now wraps the entire application here */}
        <LiveOptionDataProvider>
          {/* This 'main' tag is where page content will be rendered */}
          <main
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "20px",
            }}
          >
            {children}
          </main>
        </LiveOptionDataProvider>
      </body>
    </html>
  );
}
