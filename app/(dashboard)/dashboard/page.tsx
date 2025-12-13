'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { customerPortalAction } from '@/lib/payments/actions';
import { useActionState } from 'react';
import { User } from '@supabase/supabase-js';
import { removeTeamMember, inviteTeamMember } from '@/app/(login)/actions';
import useSWR from 'swr';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Download, Image, Video, Trash2, Circle } from 'lucide-react';
import { useTranslation, useLanguage } from '@/lib/contexts/language-context';

type ActionState = {
  error?: string;
  success?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Generation {
  id: string;
  type: 'image' | 'video';
  result_url: string;
  created_at: string;
}

function SubscriptionSkeleton() {
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>Team Subscription</CardTitle>
      </CardHeader>
    </Card>
  );
}

// 生成历史组件现在成为主要内容

function TeamMembersSkeleton() {
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-4 mt-1">
          <div className="flex items-center space-x-4">
            <div className="size-8 rounded-full bg-gray-200"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-3 w-14 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembers() {
  const { data: teamData } = useSWR<any>('/api/team', fetcher);
  const [removeState, removeAction, isRemovePending] = useActionState<
    ActionState,
    FormData
  >(removeTeamMember, {});

  const getUserDisplayName = (user: any) => {
    return user?.name || user?.email || 'Unknown User';
  };

  if (!teamData?.teamMembers?.length) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No team members yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {teamData.teamMembers.map((member: any, index: number) => (
            <li key={member.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar>
                  {/* 
                    This app doesn't save profile images, but here
                    is how you'd show them:

                    <AvatarImage
                      src={member.user.image || ''}
                      alt={getUserDisplayName(member.user)}
                    />
                  */}
                  <AvatarFallback>
                    {getUserDisplayName(member.user)
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {getUserDisplayName(member.user)}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {member.role}
                  </p>
                </div>
              </div>
              {index > 1 ? (
                <form action={removeAction}>
                  <input type="hidden" name="memberId" value={member.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={isRemovePending}
                  >
                    {isRemovePending ? 'Removing...' : 'Remove'}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {removeState?.error && (
          <p className="text-red-500 mt-4">{removeState.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

function GenerationHistorySkeleton() {
  const { t } = useTranslation();
  
  return (
    <Card className="mb-8 h-[300px]">
      <CardHeader>
        <CardTitle>{t('generationHistory')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="size-16 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GenerationHistory() {
  const { data: generations, mutate } = useSWR<Generation[]>('/api/user/generations', fetcher);
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleCleanup = async () => {
    try {
      const response = await fetch('/api/user/generations', {
        method: 'DELETE'
      });
      if (response.ok) {
        mutate(); // 重新获取数据
        const result = await response.json();
        alert(t('cleanupComplete', { count: result.deleted }));
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert(t('cleanupFailed'));
    }
  };

  const formatDate = (dateString: string) => {
    const localeCode = currentLanguage === 'zh' ? 'zh-CN' : currentLanguage === 'ja' ? 'ja-JP' : 'en-US';
    return new Date(dateString).toLocaleString(localeCode);
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('generationHistory')}</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCleanup}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('cleanupOldRecords')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!generations?.length ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Circle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('noGenerationHistoryYet')}
            </h3>
            <p className="text-gray-500 mb-4">
              {t('startGeneratingContent')}
            </p>
            <Button asChild>
              <Link href="/generate">
                {t('startGenerating')}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {generations.map((gen) => (
              <div key={gen.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  {gen.type === 'image' ? (
                    <img 
                      src={gen.result_url} 
                      alt="Generated" 
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <video 
                      src={gen.result_url} 
                      className="w-16 h-16 object-cover rounded"
                      muted
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    {gen.type === 'image' ? (
                      <Image className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Video className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm font-medium">
                      {gen.type === 'image' ? t('imageGenType') : t('shortVideoGenType')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDate(gen.created_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(
                    gen.result_url,
                    `monna-${gen.type}-${gen.id.slice(0, 8)}.${gen.type === 'image' ? 'png' : 'mp4'}`
                  )}
                  title={t('downloadAgain')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InviteTeamMemberSkeleton() {
  return (
    <Card className="h-[260px]">
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
      </CardHeader>
    </Card>
  );
}

function InviteTeamMember() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const isOwner = user?.role === 'owner';
  const [inviteState, inviteAction, isInvitePending] = useActionState<
    ActionState,
    FormData
  >(inviteTeamMember, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={inviteAction} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-2">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email"
              required
              disabled={!isOwner}
            />
          </div>
          <div>
            <Label>Role</Label>
            <RadioGroup
              defaultValue="member"
              name="role"
              className="flex space-x-4"
              disabled={!isOwner}
            >
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="member" id="member" />
                <Label htmlFor="member">Member</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="owner" id="owner" />
                <Label htmlFor="owner">Owner</Label>
              </div>
            </RadioGroup>
          </div>
          {inviteState?.error && (
            <p className="text-red-500">{inviteState.error}</p>
          )}
          {inviteState?.success && (
            <p className="text-green-500">{inviteState.success}</p>
          )}
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isInvitePending || !isOwner}
          >
            {isInvitePending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Invite Member
              </>
            )}
          </Button>
        </form>
      </CardContent>
      {!isOwner && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            You must be a team owner to invite new members.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

export default function GenerationHistoryPage() {
  const { t } = useTranslation();
  
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">{t('generationHistory')}</h1>
      
      <Suspense fallback={<GenerationHistorySkeleton />}>
        <GenerationHistory />
      </Suspense>
    </section>
  );
}
