'use client'

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Quill: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    katex: any;
  }
}

interface RichTextEditorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({ value = "", onChange, placeholder = "Enter text...", className = "", minHeight = "150px" }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);
  const isInitializing = useRef(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    // Check if Quill is loaded
    if (!window.Quill) {
      const timer = setInterval(() => {
        if (window.Quill) {
          clearInterval(timer);
          initQuill();
        }
      }, 500);
      return () => clearInterval(timer);
    } else {
      initQuill();
    }

    function initQuill() {
      if (quillRef.current || !containerRef.current) return;

      const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        ['blockquote', 'code-block'],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],         // H1-H6
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
        [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'align': [] }],
        ['formula'],                                      // formula needs katex
        ['clean']                                         // remove formatting button
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options: any = {
        theme: 'snow',
        modules: {
          toolbar: toolbarOptions,
        },
        placeholder
      };

      if (window.katex) {
        options.modules.formula = true;
      } else {
        // Remove formula from toolbar if katex is missing
        options.modules.toolbar = toolbarOptions.filter((row: unknown) => {
          if (Array.isArray(row)) {
            return !row.includes('formula');
          }
          return row !== 'formula';
        });
      }

      const editorDiv = document.createElement('div');
      if (currentContainer) currentContainer.appendChild(editorDiv);

      const quill = new window.Quill(editorDiv, options);
      quillRef.current = quill;

      if (value) {
        quill.clipboard.dangerouslyPasteHTML(value);
      }

      quill.on('text-change', () => {
        if (isInitializing.current) return;
        const html = quill.root.innerHTML;
        onChange(html === '<p><br></p>' ? '' : html);
      });

      isInitializing.current = false;
    }

    return () => {
      // Cleanup
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update editor if external value changes
  useEffect(() => {
    if (quillRef.current && value) {
      const currentHtml = quillRef.current.root.innerHTML;
      if (value !== currentHtml && value !== '<p><br></p>') {
        isInitializing.current = true;
        quillRef.current.clipboard.dangerouslyPasteHTML(value);
        isInitializing.current = false;
      }
    } else if (quillRef.current && !value) {
      isInitializing.current = true;
      quillRef.current.setText('');
      isInitializing.current = false;
    }
  }, [value]);

  return (
    <div
      className={`relative bg-white dark:bg-neutral-900 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800 [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:rounded-b-md [&_.ql-toolbar]:border-neutral-200 dark:[&_.ql-toolbar]:border-neutral-800 [&_.ql-container]:border-neutral-200 dark:[&_.ql-container]:border-neutral-800 [&_.ql-editor]:text-neutral-900 dark:[&_.ql-editor]:text-neutral-100 dark:[&_.ql-picker-options]:bg-neutral-900 dark:[&_.ql-picker-item]:text-neutral-100 ${!isExpanded ? 'quill-compact' : ''} ${className}`}
      style={{ '--ql-editor-min-height': minHeight } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute top-[8px] right-[8px] z-10 p-1 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        title={isExpanded ? "Show basic formatting" : "Show all formatting"}
      >
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <style dangerouslySetInnerHTML={{
        __html: `
        .rich-editor-wrapper-${minHeight.replace(/[^a-zA-Z0-9]/g, '')} .ql-editor { min-height: ${minHeight}; }
        /* When compact, hide all toolbar formats starting from the 4th format group (i.e. lists onwards) */
        .quill-compact .ql-toolbar .ql-formats:nth-child(n+4) {
          display: none;
        }
        /* Add right padding to toolbar so it doesn't overlap the toggle button */
        .ql-toolbar {
          padding-right: 40px !important;
        }
      `}} />
      <div className={`rich-editor-wrapper-${minHeight.replace(/[^a-zA-Z0-9]/g, '')}`} ref={containerRef} />
    </div>
  );
}
