'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { RiPauseFill, RiPlayFill } from 'react-icons/ri';
import systemLogo from '@/assets/system_logo.svg';
import { LOGIN_PANEL_WIDTH } from '@/components/layout/login-aside';

// Tela inicial: vídeo institucional à direita da lateral de login (components/layout/login-aside.jsx).
export default function Home() {
  const video = useRef(null);
  const [playing, setPlaying] = useState(true);

  // Movimento reduzido: começa parado no poster; a pessoa pode iniciar pelo botão.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.current?.pause();
      setPlaying(false);
    }
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <section
      aria-label="Vídeo institucional ESG FIEMS"
      className="fixed inset-y-0 right-0 hidden bg-[#0A1C3F] md:block"
      style={{ left: `calc(${LOGIN_PANEL_WIDTH} - 2rem)` }}
    >
      {/* O texto e a marca do Sistema FIEMS fazem parte do próprio vídeo; o enquadramento mantém a frase inteira. */}
      <video
        ref={video}
        src="/home-video.mp4"
        poster="/home-video-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="h-full w-full object-cover object-[51%_50%]"
      />
      {/* A marca d'água do vídeo fica no canto direito e sai do enquadramento com o painel aberto: a versão
          oficial (monocromática branca) ocupa o mesmo canto, sobre um leve escurecimento. Em telas muito largas a
          marca do vídeo aparece inteira, e esta não é exibida. */}
      <div className="pointer-events-none absolute right-0 top-0 h-[45%] w-[32%] bg-[radial-gradient(ellipse_100%_100%_at_100%_0%,rgba(5,16,40,1),rgba(5,16,40,0.96)_28%,rgba(5,16,40,0.62)_48%,rgba(5,16,40,0.22)_72%,transparent_100%)] [@media(min-aspect-ratio:2/1)]:hidden" />
      <Image
        src={systemLogo}
        alt="Sistema FIEMS"
        className="pointer-events-none absolute right-[1.2%] top-[6.5%] h-auto w-[18%] max-w-[15rem] brightness-0 invert [@media(min-aspect-ratio:2/1)]:hidden"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pausar vídeo institucional' : 'Reproduzir vídeo institucional'}
        className="absolute bottom-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {playing ? <RiPauseFill className="h-5 w-5" /> : <RiPlayFill className="h-5 w-5" />}
      </button>
    </section>
  );
}
