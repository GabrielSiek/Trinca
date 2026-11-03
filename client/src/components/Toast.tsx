import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { c } from '../theme.ts';

type Listener = (message: string | null) => void;

let listener: Listener | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string) {
  listener?.(message);
  clearTimeout(timer);
  timer = setTimeout(() => listener?.(null), 4500);
}

export const toastError = (err: unknown) => toast(err instanceof Error ? err.message : 'Algo deu errado');

const Box = styled.div`
  position: fixed;
  z-index: 50;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  max-width: min(440px, calc(100vw - 32px));
  padding: 12px 18px;
  border-radius: 12px;
  background: ${c.field};
  border: 1px solid ${c.orange};
  color: ${c.text};
  font-weight: 600;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
`;

export function Toaster() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    listener = setMessage;
    return () => { listener = null; };
  }, []);
  return message ? <Box role="status">{message}</Box> : null;
}
