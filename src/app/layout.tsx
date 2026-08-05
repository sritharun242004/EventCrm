import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ToastHost } from "@/components/ui/Toast";
import "./globals.css";

/**
 * Type roles:
 *   - display: editorial serif with soft optical sizing — used for headings + KPI values
 *   - sans: well-set humanist sans for body, nav, labels
 *   - mono: tabular monospaced for every number, ID, time, and data cell
 * Not Inter, not Space Grotesk — those are the AI-safe defaults.
 */
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  // Variable font — weight axis is default; only extra axes need declaring.
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eventbot · Producer's Console",
  description:
    "A production console for an event management company — programme, budgets, vendors, and run of show.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
