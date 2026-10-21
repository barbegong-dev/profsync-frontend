import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { FeedbackProvider } from "@/components/ui/feedback";

export const metadata: Metadata = {
  title: "ProfSync - Faculty Document Tracking",
  description: "ProfSync: Securely track and manage faculty document submissions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Layout>
            {children}
          </Layout>
        </AuthProvider>
        <FeedbackProvider />
      </body>
    </html>
  );
}
