'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { useTranslation } from '@/lib/contexts/language-context';

interface SubmitButtonProps {
  text?: string;
  disabled?: boolean;
}

export function SubmitButton({ text, disabled = false }: SubmitButtonProps) {
  const { t } = useTranslation();
  const { pending } = useFormStatus();

  useEffect(() => {
    if (pending) {
      console.log('[SubmitButton] Form submission started');
    }
  }, [pending]);

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      variant={disabled ? "secondary" : "default"}
      className={`w-full rounded-full ${
        disabled ? '' : 'bg-black text-white hover:bg-gray-800'
      }`}
      onClick={() => {
        console.log('[SubmitButton] Button clicked', { pending, disabled });
      }}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
          {t('processing')}
        </>
      ) : (
        <>
          {text || t('getStarted')}
          {!disabled && <ArrowRight className="ml-2 h-4 w-4" />}
        </>
      )}
    </Button>
  );
}
