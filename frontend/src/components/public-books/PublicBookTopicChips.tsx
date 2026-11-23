import { UNTAD_ACADEMIC_TOPICS, type UntadTopicId } from '../../services/public-book-service';
import { cn } from '../../lib/cn';

export interface PublicBookTopicChipsProps {
  activeTopic: string | null;
  onSelectTopic: (topicId: UntadTopicId) => void;
  disabled?: boolean;
}

export function PublicBookTopicChips({
  activeTopic,
  onSelectTopic,
  disabled = false,
}: PublicBookTopicChipsProps) {
  return (
    <div
      role="region"
      aria-label="Pilihan topik akademik UNTAD"
      className="flex items-center gap-2 overflow-x-auto pb-1 text-sm no-scrollbar sm:flex-wrap"
    >
      <span className="shrink-0 text-xs font-semibold text-[var(--color-ink-subtle)] uppercase tracking-wider">
        Topik UNTAD:
      </span>
      {UNTAD_ACADEMIC_TOPICS.map((topic) => {
        const isActive = activeTopic === topic.id;
        return (
          <button
            key={topic.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onSelectTopic(topic.id)}
            className={cn(
              'inline-flex min-h-[36px] shrink-0 items-center rounded-full border px-3.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] font-semibold text-white shadow-xs'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[var(--color-primary-border)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {topic.label}
          </button>
        );
      })}
    </div>
  );
}
