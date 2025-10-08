'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

interface SubmitButtonProps {
  text?: string;
  disabled?: boolean;
}

export function SubmitButton({ text = "开始使用", disabled = false }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      variant={disabled ? "secondary" : "outline"}
      className="w-full rounded-full"
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
          处理中...
        </>
      ) : (
        <>
          {text}
          {!disabled && <ArrowRight className="ml-2 h-4 w-4" />}
        </>
      )}
    </Button>
  );
}
