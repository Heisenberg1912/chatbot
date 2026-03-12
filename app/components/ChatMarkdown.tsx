'use client';

import ReactMarkdown from 'react-markdown';

export default function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="chat-markdown text-sm">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
