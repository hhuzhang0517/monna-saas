import { z } from 'zod';
import { Team } from '@/lib/db/queries';
import { getTeamForUser, getUser, createUserTeam } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { User } from '@supabase/supabase-js';

export type ActionState = {
  error?: string;
  success?: string;
  [key: string]: any; // This allows for additional properties
};

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData
) => Promise<T>;

export function validatedAction<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData) => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message };
    }

    return action(result.data, formData);
  };
}

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData) => {
    const user = await getUser();
    if (!user) {
      throw new Error('User is not authenticated');
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message };
    }

    return action(result.data, formData, user);
  };
}

type ActionWithTeamFunction<T> = (
  formData: FormData,
  team: any
) => Promise<T>;

export function withTeam<T>(action: ActionWithTeamFunction<T>) {
  return async (formData: FormData): Promise<T> => {
    const user = await getUser();
    if (!user) {
      redirect('/');
    }

    let team = await getTeamForUser();
    if (!team) {
      // Auto-create a team for the user if they don't have one
      console.log('No team found for user, will create one');
      try {
        team = await createUserTeam(user);
        console.log('Successfully created team:', team?.id);
      } catch (error) {
        console.error('Failed to create user team in withTeam:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // 如果创建团队失败，抛出有意义的错误
        throw new Error(`Unable to create team for user: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!team) {
      // 如果团队仍然为空，抛出错误而不是继续
      throw new Error('No team found for user and unable to create one.');
    }

    return action(formData, team);
  };
}
