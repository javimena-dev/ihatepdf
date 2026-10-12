import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Check, FileImage, FileStack, Github, Images, LockKeyhole, Merge, Pencil, Scissors, ShieldCheck } from 'lucide-react';

const tools = [
  { href: '/editor?mode=merge', icon: Merge, title: 'Unir PDFs', description: 'Todos tus documentos, en uno. Combina y ordena tus archivos como quieras.', action: 'Unir archivos' },
  { href: '/editor?mode=split', icon: Scissors, title: 'Dividir PDF', description: 'Quédate con lo que necesitas. Extrae páginas o elige un rango de tu documento.', action: 'Dividir archivo' },
  { href: '/editor?mode=edit', icon: Pencil, title: 'Editar PDF', description: 'Dale el último toque. Elimina páginas e inserta imágenes justo donde las necesitas.', action: 'Editar archivo' },
  { href: '/image-to-pdf', icon: FileImage, title: 'Imagen a PDF', description: 'Convierte tus imágenes PNG o JPG en un PDF ordenado y listo para compartir.', action: 'Crear PDF' },
  { href: '/extract-images', icon: Images, title: 'Extraer imágenes', description: 'Encuentra imágenes incrustadas en PDF y descárgalas en un clic.', action: 'Extraer imágenes' },
];

const floatingPdfs = [
  { x: '10%', y: '18%', size: 110, rotate: '-13deg', duration: '23s', delay: '-3s' },
  { x: '39%', y: '5%', size: 46, rotate: '12deg', duration: '29s', delay: '-14s' },
  { x: '85%', y: '23%', size: 138, rotate: '14deg', duration: '27s', delay: '-7s' },
  { x: '4%', y: '64%', size: 61, rotate: '17deg', duration: '25s', delay: '-11s' },
  { x: '15%', y: '84%', size: 92, rotate: '-9deg', duration: '31s', delay: '-4s' },
  { x: '80%', y: '81%', size: 119, rotate: '-16deg', duration: '26s', delay: '-18s' },
  { x: '94%', y: '60%', size: 60, rotate: '8deg', duration: '28s', delay: '-8s' },
  { x: '60%', y: '95%', size: 43, rotate: '-8deg', duration: '24s', delay: '-16s' },
];

export default function HomePage() {
  return (
    <div className="landing">
      <main id="contenido">
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-glow" aria-hidden="true" />
          <div className="floating-pdfs" aria-hidden="true">
            {floatingPdfs.map((pdf, index) => (
              <div key={index} className="floating-pdf" style={{ '--x': pdf.x, '--y': pdf.y, '--size': `${pdf.size}px`, '--rotation': pdf.rotate, '--duration': pdf.duration, '--delay': pdf.delay } as CSSProperties}>
                <Image src="/images/pdf-symbol.png" alt="" width={428} height={410} sizes="140px" className="floating-pdf-symbol" />
              </div>
            ))}
          </div>
          <div className="hero-content">
            <p className="hero-badge"><span /> Tus PDFs, sin complicaciones</p>
            <h1 id="hero-title" className="hero-wordmark">IHatePDF<span className="wordmark-dot">.</span></h1>
            <p className="hero-description">Une, divide, edita y crea PDFs en un solo lugar.<br className="desktop-break" /> Tus archivos se quedan contigo, en tu navegador.</p>
            <a className="landing-button hero-cta" href="#herramientas">Comenzar <ArrowRight size={20} aria-hidden="true" /></a>
            <div className="hero-reassurance"><span><Check size={14} /> Gratis, sin registro</span><span><LockKeyhole size={13} /> Tus archivos son tuyos</span></div>
          </div>
          <a href="#herramientas" className="hero-scroll"><span>Menos vueltas. Más hecho.</span><ArrowDown size={16} aria-hidden="true" /></a>
        </section>
        <section id="herramientas" className="landing-tools" aria-labelledby="tools-title">
          <div className="tools-heading"><div><h2 id="tools-title">¿Qué hacemos con tus archivos?</h2><p>Elige una herramienta. Del resto, nos encargamos aquí.</p></div><span className="local-label"><span /> Todo en tu navegador</span></div>
          <div className="tools-list">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.href} href={tool.href} className="landing-tool">
                  <span className="tool-icon"><Icon size={25} strokeWidth={1.6} aria-hidden="true" /></span>
                  <h3>{tool.title}</h3><p>{tool.description}</p>
                  <span className="tool-action">{tool.action}<ArrowRight size={18} aria-hidden="true" /></span>
                </Link>
              );
            })}
          </div>
        </section>
        <section id="privacidad" className="landing-privacy" aria-labelledby="privacy-title">
          <div className="privacy-icon"><ShieldCheck size={30} strokeWidth={1.4} aria-hidden="true" /></div>
          <div><h2 id="privacy-title">Lo privado se queda privado.</h2><p>Tus documentos se procesan en tu dispositivo. Sin subir archivos a un servidor, sin cuentas y sin guardar copias.</p></div>
          <span className="privacy-note"><LockKeyhole size={15} aria-hidden="true" /> Local por naturaleza</span>
        </section>
      </main>
      <footer className="landing-footer"><Link href="/" className="footer-brand"><FileStack size={19} strokeWidth={1.7} aria-hidden="true" /> IHatePDF<span>.</span></Link><p>Un poco menos de odio a los PDFs.</p><a href="https://github.com/javimena-dev/ihatepdf" target="_blank" rel="noopener noreferrer"><Github size={16} aria-hidden="true" /> Código abierto<ArrowRight size={14} aria-hidden="true" /><span className="sr-only"> (abre en otra pestaña)</span></a></footer>
    </div>
  );
}
