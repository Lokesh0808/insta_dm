import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Copy,
  GitBranch,
  Link2,
  MessageSquare,
  Play,
  Plus,
  Save,
  Target,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { PageHeader } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorState, LoadingCards } from '@/dashboard/widgets';
import { nodeTypes, paletteItems, type FlowNodeData } from '@/automation/nodes';
import { useApiQuery } from '@/hooks';
import { automationService } from '@/services';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import type { Automation } from '@/types';

const toReactFlowNodes = (automation: Automation): Node[] => {
  const workflow = automation.workflow;
  if (workflow?.nodes?.length) {
    return workflow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data as FlowNodeData,
    }));
  }

  // Build a sensible default flow from the keyword rules.
  const trigger = automation.triggers?.[0];
  const keywords = trigger?.keywords ?? [];
  const nodes: Node[] = [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 40, y: 160 },
      data: {
        label: automation.name,
        nodeType: 'trigger',
        keywords,
      },
    },
    {
      id: 'message-1',
      type: 'message',
      position: { x: 360, y: 160 },
      data: {
        label: 'Reply',
        nodeType: 'message',
        description: automation.message ?? '',
      },
    },
  ];

  const edges: Edge[] = [
    { id: 'e-trigger-message', source: 'trigger-1', target: 'message-1', type: 'smoothstep' },
  ];

  return nodes;
};

const toReactFlowEdges = (automation: Automation): Edge[] => {
  if (automation.workflow?.edges?.length) {
    return automation.workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      label: edge.label,
      type: 'smoothstep',
      animated: true,
    }));
  }
  return [{ id: 'e-trigger-message', source: 'trigger-1', target: 'message-1', type: 'smoothstep' }];
};

export default function AutomationBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState('rules');

  const { data, isLoading, error, refetch } = useApiQuery(
    ['automation', id],
    async () => {
      const response = await automationService.get(id!);
      return response.data.automation;
    },
    { enabled: Boolean(id) },
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [matchType, setMatchType] = useState('PARTIAL');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [collectLead, setCollectLead] = useState(false);
  const [leadTags, setLeadTags] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    document.title = `${data.name} — Instaflow`;
    setName(data.name);
    setDescription(data.description ?? '');
    setMessage(data.message ?? '');
    setFallbackMessage(data.fallbackMessage ?? '');
    const trigger = data.triggers?.[0];
    setKeywords(trigger?.keywords ?? []);
    setMatchType(trigger?.matchType ?? 'PARTIAL');
    setDelaySeconds(trigger?.delaySeconds ?? 2);
    setCollectLead(data.collectLead);
    setLeadTags((data.leadTags ?? []).join(', '));
    setIsActive(data.isActive);
    setPriority(data.priority ?? 0);
  }, [data]);

  const handleSave = async (workflow?: { nodes: Node[]; edges: Edge[] }) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        description,
        message,
        fallbackMessage,
        isActive,
        priority,
        collectLead,
        leadTags: leadTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        triggers: [
          {
            type: data?.triggers?.[0]?.type ?? 'KEYWORD',
            enabled: true,
            keywords,
            matchType,
            caseSensitive: false,
            mediaIds: data?.triggers?.[0]?.mediaIds ?? [],
            storyIds: data?.triggers?.[0]?.storyIds ?? [],
            delaySeconds,
          },
        ],
      };

      if (workflow) {
        payload.workflow = {
          nodes: workflow.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data,
          })),
          edges: workflow.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            label: edge.label,
          })),
        };
      }

      await automationService.update(id!, payload);
      toast.success('Automation saved');
      await refetch();
    } catch (err) {
      toast.error('Could not save the automation', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    const value = keywordInput.trim();
    if (!value) return;
    if (!keywords.includes(value)) setKeywords([...keywords, value]);
    setKeywordInput('');
  };

  if (isLoading) return <LoadingCards count={3} />;
  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;
  if (!data) return null;

  return (
    <>
      <PageHeader
        title={data.name}
        description="Configure the trigger, the reply and any advanced automation flow."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/automations')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await automationService.duplicate(id!);
                toast.success('Automation duplicated');
                await refetch();
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </Button>
            <Button variant="gradient" size="sm" loading={saving} onClick={() => void handleSave()}>
              <Save className="h-3.5 w-3.5" /> Save changes
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} id="active-toggle" />
          <Label htmlFor="active-toggle" className="cursor-pointer">
            {isActive ? 'Active' : 'Paused'}
          </Label>
        </div>
        <Badge variant={isActive ? 'success' : 'secondary'}>
          {isActive ? 'Running' : 'Paused'}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Label htmlFor="priority" className="text-xs text-muted-foreground">
            Priority
          </Label>
          <Input
            id="priority"
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="h-8 w-20"
            min={0}
            max={1000}
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rules">
            <Zap className="mr-1.5 h-3.5 w-3.5" /> Rules
          </TabsTrigger>
          <TabsTrigger value="flow">
            <GitBranch className="mr-1.5 h-3.5 w-3.5" /> Workflow builder
          </TabsTrigger>
          <TabsTrigger value="test">
            <Play className="mr-1.5 h-3.5 w-3.5" /> Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Automation details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this automation do?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Reply message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Thanks for your interest! Here is our pricing link."
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders: <code className="font-mono">{'{{username}}'}</code>,{' '}
                    <code className="font-mono">{'{{keyword}}'}</code>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fallback">Fallback message</Label>
                  <Textarea
                    id="fallback"
                    value={fallbackMessage}
                    onChange={(e) => setFallbackMessage(e.target.value)}
                    placeholder="Sent when no keyword matches."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trigger rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Keywords</Label>
                  <div className="flex gap-2">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addKeyword();
                        }
                      }}
                      placeholder="PRICE"
                    />
                    <Button variant="outline" onClick={addKeyword}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {keywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="gap-1 font-mono">
                          {keyword}
                          <button
                            onClick={() => setKeywords(keywords.filter((k) => k !== keyword))}
                            className="ml-0.5 opacity-60 hover:opacity-100"
                            aria-label={`Remove ${keyword}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Match type</Label>
                  <Select value={matchType} onValueChange={setMatchType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXACT">Exact match</SelectItem>
                      <SelectItem value="PARTIAL">Partial (word)</SelectItem>
                      <SelectItem value="CONTAINS">Contains</SelectItem>
                      <SelectItem value="STARTS_WITH">Starts with</SelectItem>
                      <SelectItem value="REGEX">Regular expression</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delay">Reply delay (seconds)</Label>
                  <Input
                    id="delay"
                    type="number"
                    min={0}
                    max={86400}
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    A short delay makes replies feel more natural and respects Meta messaging
                    policies.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label htmlFor="collect-lead">Collect leads</Label>
                    <p className="text-xs text-muted-foreground">
                      Capture the username (and any volunteered contact details) as a lead.
                    </p>
                  </div>
                  <Switch id="collect-lead" checked={collectLead} onCheckedChange={setCollectLead} />
                </div>

                {collectLead && (
                  <div className="space-y-2">
                    <Label htmlFor="lead-tags">Lead tags (comma separated)</Label>
                    <Input
                      id="lead-tags"
                      value={leadTags}
                      onChange={(e) => setLeadTags(e.target.value)}
                      placeholder="price-inquiry, website"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="flow">
          <ReactFlowProvider>
            <WorkflowCanvas
              automation={data}
              onSave={(workflow) => void handleSave(workflow)}
              saving={saving}
            />
          </ReactFlowProvider>
        </TabsContent>

        <TabsContent value="test">
          <TestPanel automation={data} />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ---------------------------------------------------------------------------
// Workflow canvas
// ---------------------------------------------------------------------------
function WorkflowCanvas({
  automation,
  onSave,
  saving,
}: {
  automation: Automation;
  onSave: (workflow: { nodes: Node[]; edges: Edge[] }) => void;
  saving: boolean;
}) {
  const initial = useMemo(
    () => ({
      nodes: toReactFlowNodes(automation),
      edges: toReactFlowEdges(automation),
    }),
    [automation],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
  }, [initial, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds)),
    [setEdges],
  );

  const addNode = (type: string, label: string) => {
    const id = `${type}-${Date.now().toString(36)}`;
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const node: Node = {
      id,
      type,
      position: { x: position.x - 110, y: position.y - 40 },
      data: {
        label,
        nodeType: type as FlowNodeData['nodeType'],
        ...(type === 'message' ? { description: '' } : {}),
        ...(type === 'delay' ? { delaySeconds: 60 } : {}),
      },
    };
    setNodes((nds) => [...nds, node]);
  };

  const updateNodeData = (id: string, patch: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)),
    );
  };

  const deleteNode = (id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  const selectedNode = nodes.find((node) => node.selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr_280px]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm">Blocks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {paletteItems.map((item) => (
            <button
              key={item.type}
              onClick={() => addNode(item.type, item.label)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <item.icon className="h-4 w-4 text-primary" />
              {item.label}
            </button>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">
            Click a block to add it to the canvas, then connect the handles to build the path.
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="h-[560px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange as (changes: NodeChange[]) => void}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
            className="bg-background"
          >
            <Background gap={18} size={1} color="hsl(var(--border))" />
            <Controls />
            <MiniMap pannable zoomable className="!bg-muted" />
          </ReactFlow>
        </div>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm">Inspector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedNode ? (
            <>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={(selectedNode.data as FlowNodeData).label ?? ''}
                  onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                />
              </div>

              {(selectedNode.type === 'message' || selectedNode.type === 'link') && (
                <div className="space-y-2">
                  <Label>{selectedNode.type === 'link' ? 'URL' : 'Message text'}</Label>
                  <Textarea
                    value={
                      (selectedNode.data as FlowNodeData).description ??
                      (selectedNode.data as FlowNodeData).url ??
                      ''
                    }
                    onChange={(e) =>
                      updateNodeData(
                        selectedNode.id,
                        selectedNode.type === 'link' ? { url: e.target.value } : { description: e.target.value },
                      )
                    }
                    placeholder={
                      selectedNode.type === 'link' ? 'https://example.com' : 'Hi {{username}}!'
                    }
                  />
                </div>
              )}

              {selectedNode.type === 'delay' && (
                <div className="space-y-2">
                  <Label>Delay (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={(selectedNode.data as FlowNodeData).delaySeconds ?? 0}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, { delaySeconds: Number(e.target.value) })
                    }
                  />
                </div>
              )}

              {selectedNode.type === 'condition' && (
                <div className="space-y-2">
                  <Label>Condition expression</Label>
                  <Input
                    value={(selectedNode.data as FlowNodeData).condition ?? ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                    placeholder="message contains 'yes'"
                  />
                </div>
              )}

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => deleteNode(selectedNode.id)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete block
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a block on the canvas to edit it.
            </p>
          )}

          <Button variant="gradient" className="w-full" loading={saving} onClick={() => onSave({ nodes, edges })}>
            <Save className="h-4 w-4" /> Save workflow
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test panel
// ---------------------------------------------------------------------------
function TestPanel({ automation }: { automation: Automation }) {
  const [text, setText] = useState('');
  const [username, setUsername] = useState('instagram_user');
  const [result, setResult] = useState<{ matched: boolean; reply: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const response = await automationService.test(automation.id, text, username);
      setResult(response.data);
    } catch (err) {
      toast.error('Test failed', { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Test this automation</CardTitle>
        <p className="text-sm text-muted-foreground">
          Simulate an inbound message to check whether the rule matches and what gets sent back.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-message">Incoming message</Label>
          <Textarea
            id="test-message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Hi, what is the price?"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="test-username">Instagram username</Label>
          <Input id="test-username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>

        <Button variant="gradient" onClick={runTest} loading={loading} disabled={!text}>
          <Play className="h-4 w-4" /> Run test
        </Button>

        {result && (
          <div className="mt-2 space-y-3 rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <Badge variant={result.matched ? 'success' : 'secondary'}>
                {result.matched ? 'Rule matched' : 'No match'}
              </Badge>
              {result.matched && (
                <span className="text-xs text-muted-foreground">The reply would be sent.</span>
              )}
            </div>
            {result.reply && (
              <div className="rounded-lg bg-card p-3 text-sm">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Reply preview</p>
                {result.reply}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
