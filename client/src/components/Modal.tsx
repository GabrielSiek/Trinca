import { useEffect, useId, useRef, type ReactNode } from 'react';
import styled from 'styled-components';
import { Button, Eyebrow, IconButton, Muted } from './ui.tsx';
import { CloseIcon } from './icons.tsx';
import { c, mobile } from '../theme.ts';

const Dialog = styled.dialog<{ $width: number }>`
  width: calc(100% - 32px);
  max-width: ${(p) => p.$width}px;
  max-height: calc(100dvh - 64px);
  padding: 0;
  overflow: hidden;
  color: ${c.text};
  background: ${c.surface};
  border: 1px solid ${c.line};
  border-radius: 22px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
  &[open] {
    display: flex;
    flex-direction: column;
  }
  &::backdrop {
    background: rgba(10, 11, 10, 0.86);
  }
  ${mobile} {
    width: 100%;
    max-width: 100%;
    height: calc(100dvh - 48px);
    max-height: none;
    margin: 48px 0 0;
    border-width: 1px 0 0;
    border-radius: 22px 22px 0 0;
  }
`;

const Header = styled.div`
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: clamp(20px, 3vw, 32px) clamp(20px, 3vw, 32px) 0;
  ${mobile} {
    gap: 12px;
    padding: 10px 16px 14px;
    border-bottom: 1px solid ${c.line};
  }
`;

const Grabber = styled.span`
  display: none;
  ${mobile} {
    display: block;
    align-self: center;
    width: 40px;
    height: 5px;
    border-radius: 999px;
    background: ${c.lineStrong};
  }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`;

const TitleText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const Title = styled.h1`
  font-size: 44px;
  font-weight: 800;
  font-stretch: 62%;
  line-height: 0.95;
  text-transform: uppercase;
  ${mobile} {
    font-size: 32px;
  }
`;

export const ModalBody = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px clamp(20px, 3vw, 32px);
  ${mobile} {
    gap: 18px;
    padding: 16px;
  }
`;

export const ModalFooter = styled.div`
  flex: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px clamp(20px, 3vw, 32px) clamp(20px, 3vw, 28px);
  border-top: 1px solid ${c.line};
  ${mobile} {
    flex-wrap: nowrap;
    padding: 12px 16px 24px;
    & > :last-child {
      flex: 1 1 auto;
    }
  }
`;

interface ModalProps {
  eyebrow?: string;
  title: string;
  width?: number;
  onClose: () => void;
  header?: ReactNode;
  children: ReactNode;
}

/** Built on <dialog>, which gives focus trapping, Esc and stacked modals for free. */
export function Modal({ eyebrow, title, width = 820, onClose, header, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current!;
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <Dialog
      ref={ref}
      $width={width}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Header>
        <Grabber aria-hidden="true" />
        <TitleRow>
          <TitleText>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <Title id={titleId}>{title}</Title>
          </TitleText>
          <IconButton aria-label="Fechar" onClick={onClose}>
            <CloseIcon size={20} />
          </IconButton>
        </TitleRow>
        {header}
      </Header>
      {children}
    </Dialog>
  );
}

interface ConfirmProps {
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({ title, text, confirmLabel, danger, onConfirm, onClose }: ConfirmProps) {
  return (
    <Modal title={title} width={460} onClose={onClose}>
      <ModalBody>
        <Muted $size={15}>{text}</Muted>
      </ModalBody>
      <ModalFooter>
        <Button $variant="quiet" $height={48} onClick={onClose}>Cancelar</Button>
        <Button $variant={danger ? 'danger' : 'primary'} $height={48} onClick={onConfirm}>{confirmLabel}</Button>
      </ModalFooter>
    </Modal>
  );
}
