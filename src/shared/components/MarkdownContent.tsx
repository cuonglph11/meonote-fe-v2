import { memo } from 'react';
import type { FC } from 'react';
import Markdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
  'data-testid'?: string;
}

export const MarkdownContent: FC<MarkdownContentProps> = memo(({
  content,
  className = '',
  'data-testid': testId,
}) => {
  return (
    <div className={`markdown-body max-w-prose ${className}`} data-testid={testId}>
      <Markdown>{content}</Markdown>
    </div>
  );
});
