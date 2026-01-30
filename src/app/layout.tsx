import type { Metadata } from "next";
import { ThemeProviderWrapper } from "@/components/shared/ThemeProviderWrapper";
import { AuthProviderWrapper } from "@/components/shared/AuthProviderWrapper";
import { ToastProviderWrapper } from "@/components/shared/ToastProviderWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "Benchmark Coach Dashboard",
  description: "Dashboard for Benchmark Coach",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProviderWrapper>
          <AuthProviderWrapper>
            <ToastProviderWrapper>
              {children}
            </ToastProviderWrapper>
          </AuthProviderWrapper>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
