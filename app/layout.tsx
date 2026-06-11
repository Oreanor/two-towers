import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Two Towers",
  description: "Board strategy prototype: Human vs Bot",
};

const themeInit = `try{var t=localStorage.getItem('two-towers.theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning className="m-0 min-h-full antialiased">
      <body className="m-0 flex min-h-full justify-center bg-[image:var(--bg-gradient)] text-fg">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
