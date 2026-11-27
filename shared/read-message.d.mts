export function recordText(value: unknown): string;
export function contentText(value: unknown): string;
export function roleOf(message: Record<string, unknown>): string;
export function messagesOf(value: unknown): Record<string, unknown>[] | null;
