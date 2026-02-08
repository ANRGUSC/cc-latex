import type { ChatMessage } from 'cc-latex-shared';
import DiffView from './DiffView';

interface Props {
  message: ChatMessage;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Basic markdown-like rendering:
 * - Code blocks with triple backticks
 * - Inline code with single backticks
 * - Bold with **
 * - Line breaks
 * Strips out <<<EDIT...>>>...<<<END_EDIT>>> blocks since those are rendered as DiffViews.
 */
function renderContent(content: string): JSX.Element[] {
  // Remove EDIT blocks from visible content
  const cleaned = content.replace(
    /<<<EDIT\s+.+?>>>[\s\S]*?<<<END_EDIT>>>/g,
    ''
  );

  const elements: JSX.Element[] = [];
  const parts = cleaned.split(/(```[\s\S]*?```)/g);

  parts.forEach((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      // Code block
      const inner = part.slice(3, -3);
      // Strip optional language identifier from first line
      const newlineIdx = inner.indexOf('\n');
      const code = newlineIdx >= 0 ? inner.slice(newlineIdx + 1) : inner;
      elements.push(
        <pre
          key={i}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            margin: '6px 0',
            overflow: 'auto',
            fontSize: 12,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          <code>{code}</code>
        </pre>
      );
    } else {
      // Process inline formatting
      const lines = part.split('\n');
      lines.forEach((line, j) => {
        if (j > 0) {
          elements.push(<br key={`br-${i}-${j}`} />);
        }
        // Don't render empty lines between content
        if (!line && j > 0 && j < lines.length - 1) return;

        // Process inline code and bold
        const inlineParts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
        const inlineElements = inlineParts.map((seg, k) => {
          if (seg.startsWith('`') && seg.endsWith('`')) {
            return (
              <code
                key={k}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  padding: '1px 5px',
                  fontSize: '0.9em',
                }}
              >
                {seg.slice(1, -1)}
              </code>
            );
          }
          if (seg.startsWith('**') && seg.endsWith('**')) {
            return (
              <strong key={k} style={{ fontWeight: 700 }}>
                {seg.slice(2, -2)}
              </strong>
            );
          }
          return <span key={k}>{seg}</span>;
        });

        elements.push(
          <span key={`line-${i}-${j}`}>{inlineElements}</span>
        );
      });
    }
  });

  return elements;
}

export default function ChatMessageComponent({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          maxWidth: '88%',
          padding: '8px 12px',
          borderRadius: isUser
            ? '12px 12px 2px 12px'
            : '12px 12px 12px 2px',
          background: isUser
            ? 'rgba(137, 180, 250, 0.2)'
            : 'var(--bg-surface)',
          border: `1px solid ${isUser ? 'rgba(137, 180, 250, 0.3)' : 'var(--border)'}`,
          fontSize: 12,
          lineHeight: 1.6,
          wordBreak: 'break-word',
        }}
      >
        <div>{renderContent(message.content)}</div>
      </div>

      <span
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          marginTop: 2,
          paddingLeft: isUser ? 0 : 4,
          paddingRight: isUser ? 4 : 0,
        }}
      >
        {formatTimestamp(message.timestamp)}
      </span>

      {message.fileEdits && message.fileEdits.length > 0 && (
        <div
          style={{
            width: '100%',
            marginTop: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {message.fileEdits.map((edit, index) => (
            <DiffView
              key={`${message.id}-edit-${index}`}
              edit={edit}
              messageId={message.id}
              editIndex={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
