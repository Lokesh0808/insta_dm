import { Automation, type IAutomation } from '../models/Automation';
import type { KeywordMatchType } from '../types/enums';

export interface MatchResult {
  matched: boolean;
  matchedKeyword?: string;
  matchedRule?: string;
}

/**
 * Normalises text for comparison: lowercase, collapse whitespace, trim.
 */
export const normalise = (value: string): string => value.toLowerCase().replace(/\s+/g, ' ').trim();

export const matchesKeyword = (
  text: string,
  keyword: string,
  matchType: KeywordMatchType = 'PARTIAL',
  caseSensitive = false,
): boolean => {
  const haystack = caseSensitive ? text.trim() : normalise(text);
  const needle = caseSensitive ? keyword.trim() : normalise(keyword);

  if (!needle) return false;

  switch (matchType) {
    case 'EXACT':
      return haystack === needle;
    case 'STARTS_WITH':
      return haystack.startsWith(needle);
    case 'CONTAINS':
      return haystack.includes(needle);
    case 'PARTIAL':
      // Whole-word match: "what is the price?" matches, but "priceless" does not.
      // Use CONTAINS when a substring match is wanted.
      try {
        const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundary = new RegExp(
          `(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`,
          caseSensitive ? '' : 'i',
        );
        return wordBoundary.test(haystack);
      } catch {
        return false;
      }
    case 'REGEX':
      try {
        return new RegExp(needle, caseSensitive ? '' : 'i').test(haystack);
      } catch {
        return false;
      }
    default:
      return false;
  }
};

export interface AutomationCandidate {
  automation: IAutomation;
  trigger: IAutomation['triggers'][number];
}

/**
 * Finds the highest priority automation whose keyword rule matches the inbound text.
 * Automations are evaluated in descending priority order; ties break on the
 * most recently created automation.
 */
export const findMatchingAutomation = async (params: {
  workspaceId: string;
  instagramAccountId: string;
  text: string;
  triggerType: string;
}): Promise<MatchResult> => {
  const automations = await Automation.find({
    workspace: params.workspaceId,
    instagramAccount: params.instagramAccountId,
    isActive: true,
    type: triggerTypeToAutomationType(params.triggerType),
  })
    .sort({ priority: -1, createdAt: -1 })
    .lean<IAutomation[]>();

  for (const automation of automations) {
    for (const trigger of automation.triggers ?? []) {
      if (!trigger.enabled) continue;
      if (trigger.type !== params.triggerType) continue;
      for (const keyword of trigger.keywords ?? []) {
        if (
          matchesKeyword(
            params.text,
            keyword,
            trigger.matchType ?? 'PARTIAL',
            trigger.caseSensitive ?? false,
          )
        ) {
          return {
            matched: true,
            matchedKeyword: keyword,
            matchedRule: `${automation.name} → ${keyword}`,
          };
        }
      }
    }
  }

  return { matched: false };
};

/** Maps a webhook trigger type onto the automation type that handles it. */
export const triggerTypeToAutomationType = (
  triggerType: string,
): 'KEYWORD_DM' | 'COMMENT_DM' | 'STORY_REPLY' | 'WELCOME_DM' | 'FOLLOW_DM' | 'WORKFLOW' => {
  switch (triggerType) {
    case 'KEYWORD':
    case 'MESSAGE_RECEIVED':
      return 'KEYWORD_DM';
    case 'COMMENT':
      return 'COMMENT_DM';
    case 'STORY_REPLY':
      return 'STORY_REPLY';
    case 'FOLLOW':
      return 'FOLLOW_DM';
    default:
      return 'KEYWORD_DM';
  }
};

/**
 * Replaces `{{variable}}` placeholders with values pulled from the context.
 */
export const renderTemplate = (
  template: string,
  context: Record<string, string | number | undefined>,
): string =>
  template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = context[key];
    return value === undefined || value === null ? '' : String(value);
  });

/** Extracts every `{{variable}}` used by a template. */
export const extractTemplateVariables = (template: string): string[] => {
  const matches = template.match(/\{\{\s*([\w.]+)\s*\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/[{}\s]/g, '')))];
};
