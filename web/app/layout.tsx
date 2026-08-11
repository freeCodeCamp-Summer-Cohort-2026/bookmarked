// @ts-ignore
import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Bookmarked",
  description: "A shared board for resources worth revisiting",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
