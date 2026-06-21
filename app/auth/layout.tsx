import type { Metadata } from 'next';

// The sign-in form is a utility page, not marketing content — keep it out of
// the index (also disallowed in robots.ts).
export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Spit Wars to play online and save your stats.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/auth' },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
