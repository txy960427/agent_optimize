export const recordText = (value) => typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? '未记录';

export function contentText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(contentText).join('\n');
  if (typeof value === 'object') {
    if (value.kwargs && typeof value.kwargs === 'object' && 'content' in value.kwargs) return contentText(value.kwargs.content);
    if (value.data && typeof value.data === 'object' && 'content' in value.data) return contentText(value.data.content);
    if ('text' in value) return contentText(value.text);
    if ('content' in value) return contentText(value.content);
    return recordText(value);
  }
  return String(value);
}

export function roleOf(message) {
  const id = Array.isArray(message.id) ? message.id.at(-1) : '';
  const role = message.role ?? message.type ?? '';
  return ['human', 'HumanMessage'].includes(String(role)) || id === 'HumanMessage' ? 'user' : ['ai', 'AIMessage'].includes(String(role)) || id === 'AIMessage' ? 'assistant' : String(role || '未分类');
}

export function messagesOf(value) {
  const list = Array.isArray(value) ? value : value && typeof value === 'object' && 'messages' in value ? value.messages : null;
  return Array.isArray(list) && list.every((item) => item && typeof item === 'object' && ('role' in item || 'type' in item || 'kwargs' in item)) ? list : null;
}
