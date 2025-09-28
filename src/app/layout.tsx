import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header-new";

export const metadata: Metadata = {
  title: "Kickstart Crypto - Decentralized Crowdfunding",
  description: "A fully decentralized crowdfunding platform powered by blockchain technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 min-h-screen">
        <Header />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
