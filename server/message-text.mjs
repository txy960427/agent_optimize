const str = (value) => typeof value === 'string' ? value : JSON.stringify(value) ?? '';

export function roleOf(message) {
  const role = message?.role ?? message?.type ?? message?.kwargs?.type ?? '';
  if (['user', 'human', 'HumanMessage'].includes(role) || message?.id?.at?.(-1) === 'HumanMessage') return 'user';
  if (['assistant', 'ai', 'AIMessage'].includes(role) || message?.id?.at?.(-1) === 'AIMessage') return 'assistant';
  return role;
}

export function contentText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(contentText).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    if (value.kwargs && 'content' in value.kwargs) return contentText(value.kwargs.content);
    if (value.data && 'content' in value.data) return contentText(value.data.content);
    if ('text' in value) return contentText(value.text);
    if ('content' in value) return contentText(value.content);
    return str(value);
  }
  return String(value);
}

export function messagesOf(value) {
  return Array.isArray(value) ? value : Array.isArray(value?.messages) ? value.messages : [];
}
