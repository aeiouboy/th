'use client';

interface ChatBubbleProps {
  text: string;
  isUser: boolean;
  suggestedActions?: string[];
  onActionClick?: (action: string) => void;
}

export function ChatBubble({ text, isUser, suggestedActions, onActionClick }: ChatBubbleProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-0'}`}>
        <div
          className={`
            px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
            ${isUser
              ? 'bg-[var(--accent-teal)] text-white rounded-br-md'
              : 'bg-stone-100 dark:bg-stone-800 text-[var(--text-primary)] rounded-bl-md'
            }
          `}
        >
          {text}
        </div>

        {/* Suggested action chips */}
        {!isUser && suggestedActions && suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestedActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onActionClick?.(action)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium
                  bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]
                  hover:bg-[var(--accent-teal)]/20 transition-colors cursor-pointer
                  border border-[var(--accent-teal)]/20"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
