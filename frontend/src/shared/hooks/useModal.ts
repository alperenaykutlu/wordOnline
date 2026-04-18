import { useState, useCallback } from 'react';

/**
 * Herhangi bir modal için generic state yönetimi.
 * Alert.alert + Alert.prompt'u tamamen replace eder.
 *
 * Kullanım:
 *   const confirm = useModal();
 *   const input   = useModal<{ defaultValue: string }>();
 *
 *   <ConfirmModal visible={confirm.isOpen} onConfirm={confirm.close} onCancel={confirm.close} />
 *   <InputModal   visible={input.isOpen}   defaultValue={input.data?.defaultValue ?? ''} ... />
 */
export function useModal<TData = undefined>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data,   setData]   = useState<TData | undefined>(undefined);

  const open  = useCallback((d?: TData) => { setData(d); setIsOpen(true);  }, []);
  const close = useCallback(()          => { setIsOpen(false);              }, []);
  const reset = useCallback(()          => { setIsOpen(false); setData(undefined); }, []);

  return { isOpen, data, open, close, reset };
}

/**
 * Promise tabanlı confirm — await confirm.ask() ile kullanılır.
 * Sonuç: true (onayla) | false (vazgeç)
 */
export function useConfirm() {
  const [isOpen,   setIsOpen]  = useState(false);
  const resolveRef = useState<((v: boolean) => void) | null>(null);

  const ask = useCallback((): Promise<boolean> => {
    setIsOpen(true);
    return new Promise((resolve) => {
      resolveRef[1](() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef[0]?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolveRef[0]?.(false);
  }, []);

  return { isOpen, ask, handleConfirm, handleCancel };
}
