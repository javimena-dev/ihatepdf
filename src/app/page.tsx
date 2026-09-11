import Link from 'next/link';
import { FilePlus2, Merge, Pencil, Scissors } from 'lucide-react';

const tools = [
  {
    mode: 'merge',
    icon: Merge,
    title: 'Unir PDFs',
    description: 'Combina varios documentos en un solo PDF.',
    color: 'bg-red-500',
  },
  {
    mode: 'split',
    icon: Scissors,
    title: 'Dividir PDF',
    description: 'Exporta rangos concretos de paginas.',
    color: 'bg-orange-500',
  },
  {
    mode: 'edit',
    icon: Pencil,
    title: 'Editar PDF',
    description: 'Elimina paginas e inserta imagenes.',
    color: 'bg-blue-500',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-gray-950">Herramientas PDF</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Carga, ordena y exporta PDFs sin enviar archivos a ningun servidor.
          </p>
        </div>
        <FilePlus2 className="hidden text-gray-300 sm:block" size={44} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.mode}
              href={`/editor?mode=${tool.mode}`}
              className="group rounded-lg border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:bg-gray-50"
            >
              <span className={`mb-5 grid h-11 w-11 place-items-center rounded ${tool.color} text-white`}>
                <Icon size={22} />
              </span>
              <h2 className="text-lg font-semibold text-gray-950">{tool.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{tool.description}</p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
