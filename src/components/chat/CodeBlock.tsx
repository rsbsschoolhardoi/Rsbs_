import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTheme } from 'next-themes';

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lang = (language || 'text').toLowerCase();

  return (
    <div className="code-block relative group rounded-xl overflow-hidden border border-border/50 my-3 shadow-sm">
      {/* Header bar */}
      <div className={`code-block-header flex items-center justify-between px-3 py-1.5 md:px-4 md:py-2 text-xs font-medium ${
        isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
      }`}>
        <span className="uppercase tracking-wider">{lang}</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md transition-all duration-200 ${
            copied
              ? 'text-emerald-400 bg-emerald-400/10'
              : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      {/* Code */}
      <pre
        className={`code-block-pre overflow-x-auto text-[0.8125rem] leading-relaxed p-4 ${
          isDark ? 'bg-[#1c1c1e] text-zinc-200' : 'bg-[#f9fafb] text-zinc-800'
        }`}
        style={{ fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace' }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
