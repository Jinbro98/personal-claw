/**
 * Session State Manager
 * 세션별 메시지 히스토리와 카운터를 관리한다.
 */

const MAX_MESSAGES = 50;
const DEFAULT_RECENT_COUNT = 5;

export class SessionState {
  private messages: string[];
  private lastMessageTime: Date | null;
  private messageCount: number;
  private assistantMessageCount: number;

  constructor() {
    this.messages = [];
    this.lastMessageTime = null;
    this.messageCount = 0;
    this.assistantMessageCount = 0;
  }

  addUserMessage(msg: string): void {
    this.messages.push(msg);
    if (this.messages.length > MAX_MESSAGES) {
      this.messages = this.messages.slice(-MAX_MESSAGES);
    }
    this.messageCount++;
    this.lastMessageTime = new Date();
  }

  addAssistantMessage(msg: string): void {
    this.assistantMessageCount++;
    this.lastMessageTime = new Date();
  }

  getRecentMessages(count: number = DEFAULT_RECENT_COUNT): string[] {
    return this.messages.slice(-count);
  }

  getMessageCount(): number {
    return this.messageCount;
  }

  getAssistantMessageCount(): number {
    return this.assistantMessageCount;
  }

  getLastMessageTime(): Date | null {
    return this.lastMessageTime;
  }

  getTimeSinceLastMessage(): number | null {
    if (!this.lastMessageTime) return null;
    return Date.now() - this.lastMessageTime.getTime();
  }

  reset(): void {
    this.messages = [];
    this.lastMessageTime = null;
    this.messageCount = 0;
    this.assistantMessageCount = 0;
  }
}
