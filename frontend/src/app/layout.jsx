import localFont from 'next/font/local';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/styles/original-tailwind.css';
import '@/styles/globals.css';
import { Providers } from './providers';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

// Fonte "myFont" do original (next/font/local, arquivo 7ecbba81…otf).
const myFont = localFont({ src: '../fonts/MyFont.otf', display: 'swap' });

export const metadata = {
  title: 'ESG',
  description: 'Plataforma ESG',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body className={`${myFont.className} `}>
        <ToastContainer />
        <div role="region" aria-label="Notifications (F8)" tabIndex={-1} style={{ pointerEvents: 'none' }}>
          <ol
            tabIndex={-1}
            className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
          />
        </div>
        <Providers>
          <div className="flex min-h-screen relative">
            <Sidebar />
            <main className="flex flex-col w-full bg-gray-50 overflow-hidden" data-container="main">
              <Header />
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
