'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';
import { User } from '@supabase/supabase-js';
import useSWR from 'swr';
import { Suspense } from 'react';
import { useTranslation } from '@/lib/contexts/language-context';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  gender?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
  genderValue?: string;
};

function AccountForm({
  state,
  nameValue = '',
  emailValue = '',
  genderValue = ''
}: AccountFormProps) {
  const { t } = useTranslation();
  
  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          {t('name')}
        </Label>
        <Input
          id="name"
          name="name"
          placeholder={t('name')}
          defaultValue={state.name || nameValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="gender" className="mb-2">
          {t('gender')}
        </Label>
        <Select name="gender" defaultValue={state.gender || genderValue || "not_specified"}>
          <SelectTrigger>
            <SelectValue placeholder={t('notSpecified')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_specified">{t('notSpecified')}</SelectItem>
            <SelectItem value="male">{t('male')}</SelectItem>
            <SelectItem value="female">{t('female')}</SelectItem>
            <SelectItem value="other">{t('other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="email" className="mb-2">
          {t('email')}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={t('email')}
          defaultValue={emailValue}
          disabled
          className="bg-gray-50"
        />
        <p className="text-sm text-gray-500 mt-1">
          {t('emailNotEditable')}
        </p>
      </div>
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<any>('/api/user', fetcher);
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
      genderValue={user?.gender ?? ''}
    />
  );
}

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );
  const { t } = useTranslation();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        {t('personalInfo')}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('personalInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={formAction}>
            <Suspense fallback={<AccountForm state={state} />}>
              <AccountFormWithData state={state} />
            </Suspense>
            {state.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            {state.success && (
              <p className="text-green-500 text-sm">{state.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('loading')}
                </>
              ) : (
                t('save')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
