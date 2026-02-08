import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FileOutput,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Play,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { saveFile, compile } from '../../api/client';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export default function PdfPreview() {
  const pdfUrl = useAppStore((s) => s.pdfUrl);
  const isCompiling = useAppStore((s) => s.isCompiling);
  const activeFilePath = useAppStore((s) => s.activeFilePath);
  const activeFileContent = useAppStore((s) => s.activeFileContent);
  const isDirty = useAppStore((s) => s.isDirty);
  const setDirty = useAppStore((s) => s.setDirty);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(false);

  const renderPage = useCallback(
    async (pageNum: number) => {
      const pdfDoc = pdfDocRef.current;
      const canvas = canvasRef.current;
      if (!pdfDoc || !canvas) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        if (!context) return;

        // Use devicePixelRatio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;
      } catch (err) {
        console.error('Failed to render page:', err);
      }
    },
    [scale]
  );

  // Load PDF when pdfUrl changes
  useEffect(() => {
    if (!pdfUrl) return;

    let cancelled = false;

    async function loadPdf() {
      setIsLoading(true);
      try {
        // Destroy previous document
        if (pdfDocRef.current) {
          await pdfDocRef.current.destroy();
          pdfDocRef.current = null;
        }

        const url = `/api/pdf/${pdfUrl}?t=${Date.now()}`;
        const doc = await pdfjsLib.getDocument(url).promise;
        if (cancelled) {
          await doc.destroy();
          return;
        }

        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error('Failed to load PDF:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // Render current page when page or scale changes
  useEffect(() => {
    if (pdfDocRef.current && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [currentPage, scale, renderPage]);

  // Re-render on container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (pdfDocRef.current && currentPage > 0) {
        renderPage(currentPage);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [currentPage, renderPage]);

  const handleRecompile = useCallback(async () => {
    try {
      if (activeFilePath && isDirty) {
        await saveFile(activeFilePath, activeFileContent);
        setDirty(false);
      }
      // Pass the active .tex file as a hint; backend auto-detects if not provided
      const mainFile = activeFilePath?.endsWith('.tex') ? activeFilePath : undefined;
      await compile(mainFile);
    } catch (err) {
      console.error('Compile failed:', err);
    }
  }, [activeFilePath, activeFileContent, isDirty, setDirty]);

  const prevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const nextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const zoomIn = () => setScale((s) => Math.min(3.0, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.4, s - 0.2));

  return (
    <>
      <div className="panel-header">
        <FileOutput size={14} className="header-icon" />
        <span>PDF Preview</span>
        <div className="header-actions">
          <button
            className="btn-sm"
            onClick={handleRecompile}
            disabled={isCompiling}
            title="Recompile (Ctrl+Shift+B)"
          >
            {isCompiling ? (
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Play size={12} />
            )}
            {isCompiling ? 'Compiling...' : 'Compile'}
          </button>

          {totalPages > 0 && (
            <>
              <button className="btn-sm" onClick={prevPage} disabled={currentPage <= 1}>
                <ChevronLeft size={12} />
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '0 2px' }}>
                {currentPage}/{totalPages}
              </span>
              <button className="btn-sm" onClick={nextPage} disabled={currentPage >= totalPages}>
                <ChevronRight size={12} />
              </button>
              <button className="btn-sm" onClick={zoomOut} title="Zoom out">
                <ZoomOut size={12} />
              </button>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 32, textAlign: 'center' }}>
                {Math.round(scale * 100)}%
              </span>
              <button className="btn-sm" onClick={zoomIn} title="Zoom in">
                <ZoomIn size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="panel-body"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: pdfUrl ? 'flex-start' : 'center',
          padding: pdfUrl ? 8 : 0,
          backgroundColor: pdfUrl ? 'var(--bg-secondary)' : 'transparent',
        }}
      >
        {isLoading || isCompiling ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              color: 'var(--text-muted)',
              padding: 32,
            }}
          >
            <Loader2
              size={28}
              strokeWidth={1.5}
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <span style={{ fontSize: 13 }}>
              {isCompiling ? 'Compiling...' : 'Loading PDF...'}
            </span>
          </div>
        ) : pdfUrl ? (
          <canvas
            ref={canvasRef}
            style={{
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
              borderRadius: 2,
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              color: 'var(--text-muted)',
            }}
          >
            <FileOutput size={32} strokeWidth={1} />
            <span style={{ fontSize: 13 }}>No PDF yet</span>
            <span style={{ fontSize: 12 }}>
              Click Compile or press Ctrl+Shift+B
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
