'use client';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { BsWhatsapp } from 'react-icons/bs';
import { Modal } from '@/components/ui/modal';
import { CONTACT_EMAIL, CONTACT_PHONE, formatPhone, whatsappLink } from '@/lib/format';

const ContactLink = ({ children, href }) => (
  <Link
    href={href}
    target="_blank"
    className="border border-primary text-primary bg-transparent shadow-sm hover:bg-primary hover:text-white px-6 py-2 rounded-md flex justify-center items-center gap-2"
  >
    {children}
  </Link>
);

// "PRECISA DE AJUDA? Fale conosco" (sidebar e tela de login).
export function HelpModal({ setIsModalOpenFunction }) {
  return (
    <Modal.Root closeModal={() => setIsModalOpenFunction(false)} className="w-[400px] flex flex-col items-center gap-6">
      <Modal.Title classes="text-3xl font-bold text-primary-03 text-center">
        PRECISA DE AJUDA?
        <div>Fale conosco</div>
      </Modal.Title>
      <Modal.Content className="max-w-[33.25rem] flex flex-col gap-4">
        <div className="flex flex-col gap-5">
          <ContactLink href={whatsappLink()}>
            <BsWhatsapp size="1.25rem" />
            Whatsapp
          </ContactLink>
          <ContactLink href={`mailto:${CONTACT_EMAIL}`}>
            <Icon icon="mdi:email-fast-outline" width={25} />
            E-mail
          </ContactLink>
          <ContactLink href={`tel:+55${CONTACT_PHONE}`}>
            <Icon icon="mdi:phone" width={25} />
            {formatPhone(CONTACT_PHONE)}
          </ContactLink>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}
