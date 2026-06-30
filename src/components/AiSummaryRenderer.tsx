import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";

interface AiSummaryRendererProps {
  markdown: string;
  isStreaming?: boolean;
}

export function AiSummaryRenderer({ markdown, isStreaming = false }: AiSummaryRendererProps) {
  // Sanitize the raw content before rendering.
  // Performs client-side validation using DOMPurify to scrub scripts and inline event handlers.
  const sanitizedContent = useMemo(() => {
    if (typeof window === "undefined") {
      // Return raw content for SSR hydration matching, then sanitize on client
      return markdown;
    }

    // Configure DOMPurify to strip dangerous elements (scripts, onerror)
    // while keeping harmless elements like images (without event handlers)
    return DOMPurify.sanitize(markdown, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["script", "iframe", "object", "embed", "style"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    });
  }, [markdown]);

  return (
    <div className="relative text-slate-300 leading-relaxed font-sans text-sm md:text-base select-text">
      {isStreaming && (
        <div className="absolute top-2 right-2 flex items-center space-x-1.5 text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded-full animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
          <span>Streaming AI Summary...</span>
        </div>
      )}

      <div className="prose prose-slate prose-invert max-w-none 
        prose-headings:text-slate-100 prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3
        prose-h2:text-lg prose-h2:border-b prose-h2:border-slate-800 prose-h2:pb-2
        prose-p:mb-4 prose-p:text-slate-300
        prose-ul:list-disc prose-ul:pl-5 prose-ul:mb-4
        prose-li:mb-1 prose-li:text-slate-300
        prose-strong:text-cyan-400 prose-strong:font-semibold
        prose-code:text-cyan-300 prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-4 prose-pre:overflow-x-auto">
        <ReactMarkdown
          components={{
            // Provide premium visual styling for code blocks
            pre: ({ node, ...props }) => (
              <pre className="relative group overflow-x-auto bg-slate-950 rounded-lg p-4 border border-slate-850 shadow-inner font-mono text-xs md:text-sm text-slate-200" {...props} />
            ),
            code: ({ node, inline, className, children, ...props }: any) => {
              if (inline) {
                return (
                  <code className="bg-slate-900/60 border border-slate-800/40 text-cyan-400 text-xs px-1.5 py-0.5 rounded font-mono" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code className="block text-emerald-400 font-mono" {...props}>
                  {children}
                </code>
              );
            },
            // Custom styling for lists
            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-slate-300" {...props} />,
            li: ({ node, ...props }) => <li className="text-slate-300" {...props} />,
            p: ({ node, ...props }) => <p className="mb-4 text-slate-300" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-lg font-semibold text-slate-100 border-b border-slate-800/60 pb-1.5 mt-6 mb-3" {...props} />,
          }}
        >
          {sanitizedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
