import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Search, Send, Sparkles, User } from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { EmptyState, ErrorState } from '@/dashboard/widgets';
import { useApiQuery, useDebounce } from '@/hooks';
import { conversationService } from '@/services';
import { getSocket } from '@/services/socket';
import { toast } from '@/components/ui/toaster';
import { cn, formatDateTime, initials, relativeTime } from '@/lib/utils';
import type { Conversation } from '@/types';

export default function ConversationsPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, error, refetch } = useApiQuery(
    ['conversations', debouncedSearch],
    async () => {
      const response = await conversationService.list({
        search: debouncedSearch || undefined,
        limit: 100,
      });
      return response.data.conversations;
    },
  );

  const activeConversation = useMemo(
    () => (data ?? []).find((conversation) => conversation.id === selectedId) ?? data?.[0],
    [data, selectedId],
  );

  const { data: thread } = useApiQuery(
    ['conversation', activeConversation?.id],
    async () => {
      const response = await conversationService.get(activeConversation!.id);
      return response.data;
    },
    { enabled: Boolean(activeConversation?.id) },
  );

  useEffect(() => {
    document.title = 'Conversations — Instaflow';
    const socket = getSocket();
    const refresh = () => void refetch();
    socket.on('conversation:updated', refresh);
    socket.on('automation:executed', refresh);
    return () => {
      socket.off('conversation:updated', refresh);
      socket.off('automation:executed', refresh);
    };
  }, [refetch]);

  useEffect(() => {
    if (activeConversation?.unreadCount) {
      void conversationService.markRead(activeConversation.id);
    }
  }, [activeConversation?.id, activeConversation?.unreadCount]);

  const sendReply = async () => {
    if (!reply.trim() || !activeConversation) return;
    setSending(true);
    try {
      await conversationService.reply(activeConversation.id, reply.trim());
      setReply('');
      toast.success('Reply sent');
    } catch (err) {
      toast.error('Could not send the reply', { description: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title="Conversations"
        description="Every Instagram DM, automated and manual, in one place."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="h-[620px]">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-lg bg-muted/60" />
                ))}
              </div>
            ) : (data?.length ?? 0) === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Inbound Instagram messages will appear here."
                className="m-3 border-none"
              />
            ) : (
              <div className="divide-y divide-border/60">
                {data?.map((conversation: Conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedId(conversation.id)}
                    className={cn(
                      'flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50',
                      activeConversation?.id === conversation.id && 'bg-primary/5',
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      {conversation.avatarUrl ? (
                        <img src={conversation.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <AvatarFallback>{initials(conversation.igUsername)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          @{conversation.igUsername ?? 'unknown'}
                        </p>
                        {conversation.lastMessageAt && (
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {relativeTime(conversation.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {conversation.lastMessage ?? 'No messages yet'}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {conversation.isAutomated && (
                          <Badge variant="info" className="gap-1 text-[10px]">
                            <Sparkles className="h-2.5 w-2.5" /> Auto
                          </Badge>
                        )}
                        {conversation.unreadCount > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          {!activeConversation ? (
            <EmptyState
              icon={User}
              title="Select a conversation"
              description="Choose a conversation from the list to read the full thread."
              className="m-6 border-none"
            />
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{initials(activeConversation.igUsername)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">@{activeConversation.igUsername}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeConversation.instagramAccount?.username
                      ? `via @${activeConversation.instagramAccount.username}`
                      : 'Instagram DM'}
                    {activeConversation.messagingWindowExpiresAt &&
                      new Date(activeConversation.messagingWindowExpiresAt) > new Date() && (
                        <span className="ml-2 text-success">· messaging window open</span>
                      )}
                  </p>
                </div>
                {activeConversation.isAutomated && (
                  <Badge variant="info" className="gap-1">
                    <Sparkles className="h-3 w-3" /> Automated
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[450px] px-5 py-4">
                <div className="space-y-3">
                  {thread?.messages?.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex max-w-[78%] flex-col gap-1 rounded-2xl px-4 py-2.5 text-sm',
                        message.direction === 'inbound'
                          ? 'self-start bg-muted text-foreground'
                          : 'self-end bg-primary text-primary-foreground',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      <span
                        className={cn(
                          'text-[10px]',
                          message.direction === 'inbound'
                            ? 'text-muted-foreground'
                            : 'text-primary-foreground/70',
                        )}
                      >
                        {formatDateTime(message.sentAt)}
                      </span>
                    </div>
                  ))}
                  {(thread?.messages?.length ?? 0) === 0 && (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No messages in this conversation yet.
                    </p>
                  )}
                </div>
              </ScrollArea>

              <Separator />
              <div className="flex items-end gap-2 p-4">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendReply();
                    }
                  }}
                  placeholder="Type a reply… (Enter to send, Shift+Enter for a new line)"
                  className="min-h-[44px]"
                />
                <Button variant="gradient" size="icon" onClick={sendReply} loading={sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
