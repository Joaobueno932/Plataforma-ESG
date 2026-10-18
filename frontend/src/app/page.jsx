// Tela inicial: vídeo de fundo à direita da lateral de login.
export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-blue-500">
      <video src="./home-video.mp4" autoPlay loop muted className="w-full h-full object-cover" />
      <div className="absolute top-0 left-0 w-full h-full bg-[#1e65ff1c]" />
    </div>
  );
}
