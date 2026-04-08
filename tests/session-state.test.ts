import { describe, it, expect, beforeEach } from 'vitest';
import { SessionState } from '../src/core/session-state.js';

describe('SessionState', () => {
  let state: SessionState;

  beforeEach(() => {
    state = new SessionState();
  });

  it('creates an empty instance', () => {
    expect(state.getRecentMessages()).toEqual([]);
    expect(state.getMessageCount()).toBe(0);
    expect(state.getAssistantMessageCount()).toBe(0);
    expect(state.getLastMessageTime()).toBeNull();
    expect(state.getTimeSinceLastMessage()).toBeNull();
  });

  it('adds user messages and updates count/time', () => {
    state.addUserMessage('안녕');
    expect(state.getMessageCount()).toBe(1);
    expect(state.getRecentMessages()).toEqual(['안녕']);
    expect(state.getLastMessageTime()).toBeInstanceOf(Date);
    expect(state.getTimeSinceLastMessage()).toBeGreaterThanOrEqual(0);
  });

  it('returns recent messages with default limit of 5', () => {
    for (let i = 0; i < 10; i++) {
      state.addUserMessage(`msg-${i}`);
    }
    const recent = state.getRecentMessages();
    expect(recent).toHaveLength(5);
    expect(recent[0]).toBe('msg-5');
    expect(recent[4]).toBe('msg-9');
  });

  it('returns recent messages with custom count', () => {
    for (let i = 0; i < 10; i++) {
      state.addUserMessage(`msg-${i}`);
    }
    expect(state.getRecentMessages(3)).toEqual(['msg-7', 'msg-8', 'msg-9']);
  });

  it('trims messages beyond 50', () => {
    for (let i = 0; i < 55; i++) {
      state.addUserMessage(`msg-${i}`);
    }
    expect(state.getRecentMessages(60)).toHaveLength(50);
    expect(state.getRecentMessages(60)[0]).toBe('msg-5');
    expect(state.getRecentMessages(60)[49]).toBe('msg-54');
  });

  it('counts assistant messages without storing them', () => {
    state.addUserMessage('hello');
    state.addAssistantMessage('hi there');
    expect(state.getAssistantMessageCount()).toBe(1);
    expect(state.getRecentMessages()).toEqual(['hello']);
  });

  it('getTimeSinceLastMessage returns null when no messages', () => {
    expect(state.getTimeSinceLastMessage()).toBeNull();
  });

  it('getTimeSinceLastMessage returns elapsed ms after adding a message', async () => {
    state.addUserMessage('test');
    await new Promise((r) => setTimeout(r, 10));
    const elapsed = state.getTimeSinceLastMessage();
    expect(elapsed).not.toBeNull();
    expect(elapsed).toBeGreaterThanOrEqual(5);
  });

  it('reset clears all state', () => {
    state.addUserMessage('a');
    state.addUserMessage('b');
    state.addAssistantMessage('c');
    state.reset();

    expect(state.getRecentMessages()).toEqual([]);
    expect(state.getMessageCount()).toBe(0);
    expect(state.getAssistantMessageCount()).toBe(0);
    expect(state.getLastMessageTime()).toBeNull();
    expect(state.getTimeSinceLastMessage()).toBeNull();
  });
});
