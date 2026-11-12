import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Bot,
  Clock,
  GitBranch,
  Link2,
  MessageSquare,
  MousePointerClick,
  Target,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: 'trigger' | 'message' | 'condition' | 'delay' | 'link' | 'lead' | 'action';
  description?: string;
  keywords?: string[];
  delaySeconds?: number;
  condition?: string;
  url?: string;
  branchLabels?: { true?: string; false?: string };
}

const meta = {
  trigger: { icon: Zap, color: 'text-chart-1', bg: 'bg-chart-1/10', border: 'border-chart-1/40' },
  message: { icon: MessageSquare, color: 'text-chart-2', bg: 'bg-chart-2/10', border: 'border-chart-2/40' },
  condition: { icon: GitBranch, color: 'text-chart-4', bg: 'bg-chart-4/10', border: 'border-chart-4/40' },
  delay: { icon: Clock, color: 'text-chart-5', bg: 'bg-chart-5/10', border: 'border-chart-5/40' },
  link: { icon: Link2, color: 'text-chart-3', bg: 'bg-chart-3/10', border: 'border-chart-3/40' },
  lead: { icon: Target, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/40' },
  action: { icon: Bot, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
} as const;

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as FlowNodeData;
  const style = meta.trigger;
  return (
    <div
      className={cn(
        'w-56 rounded-xl border-2 bg-card p-3 shadow-lg transition-shadow',
        style.border,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-primary" />
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', style.bg, style.color)}>
          <style.icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Trigger
          </p>
          <p className="truncate text-sm font-semibold">{nodeData.label}</p>
        </div>
      </div>
      {nodeData.keywords && nodeData.keywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {nodeData.keywords.slice(0, 4).map((keyword) => (
            <span
              key={keyword}
              className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
TriggerNode.displayName = 'TriggerNode';

export const MessageNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as FlowNodeData;
  const style = meta.message;
  return (
    <div
      className={cn(
        'w-56 rounded-xl border-2 bg-card p-3 shadow-lg transition-shadow',
        style.border,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-primary" />
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', style.bg, style.color)}>
          <style.icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Message
          </p>
          <p className="truncate text-sm font-semibold">{nodeData.label}</p>
        </div>
      </div>
      {nodeData.description && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{nodeData.description}</p>
      )}
    </div>
  );
});
MessageNode.displayName = 'MessageNode';

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as FlowNodeData;
  const style = meta.condition;
  return (
    <div
      className={cn(
        'w-56 rounded-xl border-2 bg-card p-3 shadow-lg transition-shadow',
        style.border,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-primary" />
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', style.bg, style.color)}>
          <style.icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Condition
          </p>
          <p className="truncate text-sm font-semibold">{nodeData.label}</p>
        </div>
      </div>
      {nodeData.condition && (
        <p className="mt-2 truncate rounded bg-chart-4/10 px-1.5 py-1 font-mono text-[10px] text-chart-4">
          {nodeData.condition}
        </p>
      )}
      <div className="mt-2 flex justify-between gap-3">
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="!h-3 !w-3 !bg-success"
          style={{ left: '30%' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="!h-3 !w-3 !bg-destructive"
          style={{ left: '70%' }}
        />
      </div>
      <div className="mt-1 flex justify-between px-1 text-[10px] font-medium">
        <span className="text-success">Yes</span>
        <span className="text-destructive">No</span>
      </div>
    </div>
  );
});
ConditionNode.displayName = 'ConditionNode';

export const DelayNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as FlowNodeData;
  const style = meta.delay;
  return (
    <div
      className={cn(
        'w-48 rounded-xl border-2 bg-card p-3 shadow-lg transition-shadow',
        style.border,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-primary" />
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', style.bg, style.color)}>
          <style.icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Wait
          </p>
          <p className="truncate text-sm font-semibold">
            {nodeData.delaySeconds ?? 0}s delay
          </p>
        </div>
      </div>
    </div>
  );
});
DelayNode.displayName = 'DelayNode';

export const LinkNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as FlowNodeData;
  const style = meta.link;
  return (
    <div
      className={cn(
        'w-48 rounded-xl border-2 bg-card p-3 shadow-lg transition-shadow',
        style.border,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-primary" />
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', style.bg, style.color)}>
          <style.icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Send link
          </p>
          <p className="truncate text-sm font-semibold">{nodeData.label}</p>
        </div>
      </div>
      {nodeData.url && (
        <p className="mt-2 truncate rounded bg-chart-3/10 px-1.5 py-1 font-mono text-[10px] text-chart-3">
          {nodeData.url}
        </p>
      )}
    </div>
  );
});
LinkNode.displayName = 'LinkNode';

export const LeadNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as FlowNodeData;
  const style = meta.lead;
  return (
    <div
      className={cn(
        'w-48 rounded-xl border-2 bg-card p-3 shadow-lg transition-shadow',
        style.border,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-primary" />
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', style.bg, style.color)}>
          <style.icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Lead
          </p>
          <p className="truncate text-sm font-semibold">{nodeData.label}</p>
        </div>
      </div>
    </div>
  );
});
LeadNode.displayName = 'LeadNode';

export const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  condition: ConditionNode,
  delay: DelayNode,
  link: LinkNode,
  lead: LeadNode,
};

export const paletteItems = [
  { type: 'message', label: 'Send message', icon: MessageSquare },
  { type: 'condition', label: 'Condition', icon: GitBranch },
  { type: 'delay', label: 'Wait / delay', icon: Clock },
  { type: 'link', label: 'Send link', icon: Link2 },
  { type: 'lead', label: 'Capture lead', icon: Target },
] as const;
