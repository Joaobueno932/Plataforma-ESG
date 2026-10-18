'use client';
import { Icon } from '@iconify/react';
import { FiTrash2 } from 'react-icons/fi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIndicators } from '@/contexts/indicators';
import { API_URL } from '@/services/api';
import { notify } from '@/lib/toast';

// Tabela de anexos (módulo 59687). Três formatos de item:
//  - vínculo salvo   {id, fileId, file:{name,url,companyId}}
//  - evidência       {name, url, fileType}
//  - File local ainda não enviado
const isLinked = (f) => 'fileId' in f;
const isEvidence = (f) => !isLinked(f) && 'fileType' in f && !(f instanceof File);

function download(f) {
  const url = isLinked(f) ? f.file.url : f.url;
  const name = isLinked(f) ? f.file.name : f.name;
  const token = localStorage.getItem('jwt');
  if (url.startsWith('http') || token === null) return;
  const a = document.createElement('a');
  document.body.appendChild(a);
  fetch(`${API_URL}/${url}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => (r.status !== 200 ? r.json() : r.blob()))
    .then((blob) => {
      if (!(blob instanceof Blob)) throw blob;
      const href = window.URL.createObjectURL(blob);
      a.href = href;
      a.download = name;
      a.click();
      window.URL.revokeObjectURL(href);
    })
    .catch((err) => {
      console.error(err);
      notify(`Erro ao baixar arquivo - ${err?.message ?? ''}`, 'error');
    })
    .finally(() => document.body.removeChild(a));
}

const BTN =
  'inline-flex items-center justify-center rounded-md text-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-neutral-02 disabled:text-neutral-01 shadow-sm text-white h-9 px-4 py-2 cursor-pointer';

export function FilesTable({ files, remove }) {
  const { removeFile } = useIndicators();

  const onRemove = (index) => {
    const f = files[index];
    if (isEvidence(f)) return;
    if (!isLinked(f)) return remove?.(index);
    removeFile(f.id);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="w-full">
          <TableHead className="pl-4 w-[85%]">Anexo</TableHead>
          <TableHead className="text-center flex-1">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.length === 0 && (
          <TableRow>
            <TableCell colSpan={2} className="text-center">
              Nenhum arquivo anexado
            </TableCell>
          </TableRow>
        )}
        {files.map((f, i) => (
          <TableRow key={i}>
            <TableCell>{isLinked(f) ? f.file.name : f.name}</TableCell>
            <TableCell className="flex gap-2 align-middle justify-center">
              {(isLinked(f) || isEvidence(f)) && (
                <a
                  href={isLinked(f) ? f.file.url : f.url}
                  onClick={(e) => {
                    e.preventDefault();
                    download(f);
                  }}
                  className={`${BTN} bg-primary-03 hover:bg-primary-03/90`}
                  aria-label="Baixar arquivo"
                >
                  <Icon icon="basil:download-solid" />
                </a>
              )}
              {!isEvidence(f) && (
                <button className={`${BTN} bg-[#c93224] hover:bg-[#c93224e0]`} type="button" onClick={() => onRemove(i)} aria-label="Remover arquivo">
                  <FiTrash2 size="20px" />
                </button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
