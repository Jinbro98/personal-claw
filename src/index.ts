/**
 * personal-claw — OpenClaw Plugin Entry Point
 *
 * Adaptive personalization through conversation analysis.
 * Integrates signal detection, Thompson Sampling bandit,
 * phase-gated learning, and AGENTS.md injection.
 */

import type { PluginContext, PluginResult } from './types.js';

// Core modules
import { loadProfile, saveProfile, updateDimension, incrementStats } from './core/profile.js';
import { detectSignals, detectReQuestion, detectFollowUp } from './core/signals.js';
import { shouldTransition, transitionPhase } from './core/phase.js';
import { analyzeConversationLength } from './analyzer/conversation.js';
import { SessionState } from './core/session-state.js';
import { getNextABSuggestion, generateSuggestionText } from './core/ab-suggester.js';
import { detectTopic } from './core/topic-detector.js';

// Injector modules
import { buildFullPrompt, buildTopicAwarePrompt } from './injector/prompt-builder.js';
import { updateAgentsMd } from './injector/agents-md.js';

// Topic-aware profile
import { toTopicAwareProfile } from './core/profile.js';
import type { TopicAwareProfile } from './types.js';

// Tool modules
import { formatStatus } from './tools/status-tool.js';
import { resetProfile } from './tools/reset-tool.js';
import { exportProfile } from './tools/export-tool.js';

export default async function personalClawPlugin(context: PluginContext): Promise<PluginResult> {
  const dataDir = context.getDataDir();
  const workspaceDir = context.getWorkspaceDir();
  const sessionState = new SessionState(); // 세션 상태
  let abSuggestedThisSession = false; // 세션당 A/B 제안 1회 제한

  return {
    name: 'personal-claw',
    version: '2.0.0',
    description: 'Adaptive personalization through conversation analysis',

    tools: [
      {
        name: 'personal-claw-status',
        description: 'Show current personalization profile status',
        execute: async () => {
          const profile = await loadProfile(dataDir);
          return formatStatus(profile);
        },
      },
      {
        name: 'personal-claw-reset',
        description: 'Reset personalization profile to defaults',
        execute: async () => {
          const profile = await resetProfile(dataDir);
          await updateAgentsMd(workspaceDir, profile);
          return 'Profile reset to defaults.';
        },
      },
      {
        name: 'personal-claw-export',
        description: 'Export personalization profile as JSON',
        execute: async () => {
          const profile = await loadProfile(dataDir);
          return exportProfile(profile);
        },
      },
    ],

    hooks: {
      onMessage: async (message: string, _context: any) => {
        let profile = await loadProfile(dataDir);

        // 세션 상태 업데이트
        sessionState.addUserMessage(message);
        const recentMessages = sessionState.getRecentMessages();

        // 1) 기존 신호 감지
        const signals = detectSignals(message);
        for (const signal of signals) {
          if (signal.type === 'explicit_directive' && signal.dimension && signal.value) {
            profile = updateDimension(profile, signal.dimension, signal.value, 0.9);
          } else if (signal.type === 'explicit_positive') {
            profile.statistics.positive_signals += 1;
          } else if (signal.type === 'explicit_negative') {
            profile.statistics.negative_signals += 1;
          }
        }

        // 2) 재질문 감지 (새로 연결)
        const reQuestionSignal = detectReQuestion(message, recentMessages);
        if (reQuestionSignal) {
          profile.statistics.negative_signals += 1;
        }

        // 3) Follow-up 감지 (새로 연결)
        const lastTime = sessionState.getLastMessageTime();
        if (lastTime) {
          const followUpSignal = detectFollowUp(lastTime, new Date());
          if (followUpSignal) {
            profile.statistics.positive_signals += 1;
          }
        }

        // 4) 대화 길이 보상
        const lengthAnalysis = analyzeConversationLength(sessionState.getMessageCount());
        // 긴 대화 = 현재 스타일 적합 (참고용, 직접 보상은 하지 않음)

        // 5) 주제 감지
        const topic = detectTopic(message);

        // 6) A/B 제안 (Phase 2이고, 아직 제안 안 했고, 확신도 낮은 차원이 있으면)
        let abSuggestion: string | null = null;
        if (profile.phase === 'ab' && !abSuggestedThisSession) {
          const suggestion = getNextABSuggestion(profile, topic.category);
          if (suggestion) {
            abSuggestion = generateSuggestionText(suggestion);
            abSuggestedThisSession = true;
          }
        }

        // 7) 통계 업데이트
        profile = incrementStats(profile, 'total_messages');

        // 8) Phase 전환 체크
        const transition = shouldTransition(profile.phase, profile);
        if (transition.should) {
          profile = transitionPhase(profile, transition.targetPhase, transition.reason);
        }

        // 저장
        await saveProfile(dataDir, profile);
      },

      onSessionEnd: async (_context: any) => {
        let profile = await loadProfile(dataDir);
        profile = incrementStats(profile, 'total_sessions');
        await saveProfile(dataDir, profile);
        await updateAgentsMd(workspaceDir, profile);
        sessionState.reset();
        abSuggestedThisSession = false;
      },

      getSystemPromptAddition: async () => {
        const profile = await loadProfile(dataDir);
        const topicAware = toTopicAwareProfile(profile);

        // 현재 세션의 마지막 주제 감지
        const recentMessages = sessionState.getRecentMessages(3);
        const lastTopic = recentMessages.length > 0
          ? detectTopic(recentMessages[recentMessages.length - 1])
          : null;

        let prompt = buildTopicAwarePrompt(topicAware, lastTopic?.category);

        // A/B 제안이 아직 제안되지 않았으면 시스템 프롬프트에 주입
        if (!abSuggestedThisSession && profile.phase === 'ab') {
          const { getNextABSuggestion, generateSuggestionText } = await import('./core/ab-suggester.js');
          const topicHint = lastTopic?.category;
          const suggestion = getNextABSuggestion(profile, topicHint);
          if (suggestion) {
            const suggestionText = generateSuggestionText(suggestion);
            prompt += `\n\n## A/B Suggestion (auto-generated)\nUse the following suggestion naturally in your next response:\n${suggestionText}`;
            abSuggestedThisSession = true;
          }
        }

        return prompt;
      },
    },
  };
}
