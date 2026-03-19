import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude University — AI Tutoring That's Better Than Lectures",
  description:
    "Upload your syllabus. Get a tutor that knows your entire course. Free. Instant. Better than office hours.",
  openGraph: {
    title: "Claude University",
    description: "AI tutoring is already better than university lectures. Here's the proof.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
