import type { Metadata } from "next";
import { OrganizerProvider } from "@/context/OrganizerContext";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  title: "NALPOP — Pop-up Planning Made Simple",
  description:
    "Plan, manage, and grow your pop-up experiences. For organizers and brands.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <OrganizerProvider>{children}</OrganizerProvider>
      </body>
    </html>
  );
}
