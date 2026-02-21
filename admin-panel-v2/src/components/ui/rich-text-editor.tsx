'use client'

import React, { useEffect, useRef } from 'react';

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
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
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
      className={`bg-white dark:bg-neutral-900 rounded-md shadow-sm border border-neutral-200 dark:border-neutral-800 [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:rounded-b-md [&_.ql-toolbar]:border-neutral-200 dark:[&_.ql-toolbar]:border-neutral-800 [&_.ql-container]:border-neutral-200 dark:[&_.ql-container]:border-neutral-800 [&_.ql-editor]:text-neutral-900 dark:[&_.ql-editor]:text-neutral-100 dark:[&_.ql-picker-options]:bg-neutral-900 dark:[&_.ql-picker-item]:text-neutral-100 ${className}`}
      style={{ '--ql-editor-min-height': minHeight } as React.CSSProperties}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
        .rich-editor-wrapper-${minHeight.replace(/[^a-zA-Z0-9]/g, '')} .ql-editor { min-height: ${minHeight}; }
      `}} />
      <div className={`rich-editor-wrapper-${minHeight.replace(/[^a-zA-Z0-9]/g, '')}`} ref={containerRef} />
    </div>
  );
}
