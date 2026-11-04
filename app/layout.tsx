import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewBoost — Turn happy customers into 5-star Google reviews",
  description:
    "Drive positive reviews to your Google Business Profile while intercepting negative experiences through a private feedback loop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
