import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mt-4 mb-2 text-foreground border-b border-border pb-1">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mt-3 mb-1.5 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold mt-2 mb-1 text-foreground">{children}</h3>
        ),
        // Paragraphs
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
        ),
        // Bold / Italic / Strike
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
        // Inline code
        code: ({ className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const isBlock = match !== null;
          const codeStr = String(children).replace(/\n$/, '');
          if (isBlock) {
            return <CodeBlock language={match![1]} code={codeStr} />;
          }
          return (
            <code
              className="px-1.5 py-0.5 rounded text-[0.8em] font-mono bg-primary/10 text-primary border border-primary/20"
              {...props}
            >
              {children}
            </code>
          );
        },
        // Pre wrapper — CodeBlock handles full rendering
        pre: ({ children }) => <>{children}</>,
        // Lists
        ul: ({ children }) => (
          <ul className="mb-2 pl-5 space-y-1 list-none">
            {React.Children.map(children, child =>
              React.isValidElement(child)
                ? React.cloneElement(child as React.ReactElement<any>, { _marker: '•' })
                : child
            )}
          </ul>
        ),
        ol: ({ children, start }) => (
          <ol className="mb-2 pl-5 space-y-1" style={{ listStyleType: 'decimal', counterReset: `list-item ${(start ?? 1) - 1}` }}>
            {children}
          </ol>
        ),
        li: ({ children, ordered, ...props }: any) => (
          <li className="relative pl-1 flex gap-2">
            {!ordered && <span className="text-primary mt-0.5 shrink-0">•</span>}
            <span className="flex-1">{children}</span>
          </li>
        ),
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="my-2 pl-4 border-l-4 border-primary/40 text-muted-foreground italic bg-primary/5 py-1 pr-2 rounded-r-md">
            {children}
          </blockquote>
        ),
        // Table
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/60">{children}</thead>
        ),
        tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold text-foreground text-xs uppercase tracking-wider">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-muted-foreground">{children}</td>
        ),
        // Horizontal rule
        hr: () => <hr className="my-4 border-border" />,
        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
