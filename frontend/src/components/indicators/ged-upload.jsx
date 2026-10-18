'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { IoWarningOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Modal } from '@/components/ui/modal';
import { getCompanyFiles } from '@/services/companies';
import { editQuestionReport } from '@/services/reports';
import { notify } from '@/lib/toast';

/** "UPLOAD GED": vincula um arquivo já existente no GED da empresa à questão (módulo 22503). */
export function GedUpload({ questionReportId }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!open) return;
    getCompanyFiles()
      .then(setFiles)
      .catch(() => setFiles([]));
  }, [open]);

  const send = async () => {
    try {
      await editQuestionReport({ filesToAdd: [selected?.id || ''] }, questionReportId);
      setTimeout(() => window.location.reload(), 100);
      notify('Arquivo adicionado na questão', 'success');
    } catch (err) {
      notify(
        err?.response ? `Ocorreu um erro ao fazer upload do arquivo: ${err.response.data.message}` : 'Erro ao fazer upload do arquivo',
        'error',
      );
    }
    setOpen(false);
  };

  return (
    <>
      {open && (
        <Modal.Root closeModal={() => setOpen(false)} className="w-[987px]">
          <Modal.Title classes="font-semibold text-2xl text-neutral">Upload GED</Modal.Title>
          <Modal.SubTitle className="text-base text-neutral-03">
            Pesquise pelo nome do arquivo da empresa que deseja adicionar a essa pergunta, no campo de pesquisa abaixo.
          </Modal.SubTitle>
          <Modal.Content className="mt-5 flex flex-col">
            <div className="flex items-center gap-2 w-full h-14 rounded-lg border-1 px-4 bg-neutral-01 shadow-sm">
              <Combobox style={{ width: '1000px' }} placeholder="Pesquisar arquivo" data={files} textField="name" onChange={(f) => f?.id && setSelected(f)} />
            </div>
            <div className="space-y-3 mt-14 mb-40">
              <p className="flex items-center gap-1 text-neutral-03">
                <span className="flex items-center gap-1 text-base text-neutral font-semibold">
                  <IoWarningOutline />
                  Importante:
                </span>{' '}
                Selecione um arquivo por vez.
              </p>
              <h4 className="font-semibold text-neutral text-base">Arquivo selecionado:</h4>
              {selected ? (
                <div className="w-fit h-12 px-4 flex gap-2 justify-between items-center bg-white rounded-2xl shadow-md">
                  <span className="font-medium text-base text-neutral-04">{selected.name}</span>
                  <Button
                    className="border-none bg-transparent shadow-transparent hover:bg-transparent text-black rounded-lg p-1"
                    type="button"
                    onClick={() => setSelected(null)}
                  >
                    x
                  </Button>
                </div>
              ) : (
                <span className="text-neutral-03">Nenhum arquivo selecionado.</span>
              )}
            </div>
            <Button size="lg" variant="default" className="text-sm self-center w-[390px] disabled:bg-primary-03/60" type="button" onClick={send} disabled={!selected}>
              ENVIAR ARQUIVO
            </Button>
          </Modal.Content>
        </Modal.Root>
      )}
      <section className="px-2">
        <button
          onClick={() => {
            setOpen(true);
            setSelected(null);
          }}
          className="bg-[#0E3A68] w-[280px] text-white h-[40px] flex items-center justify-center rounded-sm"
          type="button"
        >
          UPLOAD GED
          <Icon icon="basil:upload-solid" width={24} style={{ marginLeft: '8px' }} />
        </button>
      </section>
    </>
  );
}
