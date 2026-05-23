import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SARA Chat — ManyChat AI Asistan | Karneyn Yazılım',
  description: 'ManyChat tabanlı AI müşteri asistanı. Instagram DM üzerinden otomatik yanıt.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
