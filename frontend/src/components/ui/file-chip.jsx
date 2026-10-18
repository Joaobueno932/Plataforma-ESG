'use client';
import { FiTrash2 } from 'react-icons/fi';
import { Button } from './button';

// Arquivo selecionado aguardando envio (módulo 95717).
export function FileChip({ fileToRender, removeFile }) {
  return (
    <div className="w-fit h-12 px-4 flex gap-2 justify-between items-center bg-white rounded-2xl shadow-md">
      <span className="font-medium text-base text-neutral-04">{fileToRender.name}</span>
      <Button variant="ghost" className="border-2 border-black text-black rounded-lg p-1" type="button" onClick={removeFile} aria-label="Remover arquivo">
        <FiTrash2 size="24px" />
      </Button>
    </div>
  );
}
