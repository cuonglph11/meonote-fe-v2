import type { FC } from 'react';
import Markdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
  'data-testid'?: string;
}

export const MarkdownContent: FC<MarkdownContentProps> = ({
  content,
  className = '',
  'data-testid': testId,
}) => {
  return (
    <div className={`markdown-body ${className}`} data-testid={testId}>
      <Markdown>{content}</Markdown>
    </div>
  );
};
