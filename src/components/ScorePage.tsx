import React, { useRef, useEffect, useState } from 'react';
import { Page } from 'react-pdf';
import { getStroke } from 'perfect-freehand';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Point, Stroke } from '../types';

interface ScorePageProps {
  id: string;
  pdfUrl: string;
  pageNumber: number;
  index: number;
  annotations: Stroke[];
  onAddAnnotation: (stroke: Stroke) => void;
  onRemoveAnnotation: (id: string) => void;
  tool: 'pencil' | 'highlighter' | 'eraser' | 'none';
  activeColor: string;
  activeWidth: number;
  scale: number;
  containerWidth: number;
}

export function ScorePage({
  id,
  pdfUrl,
  pageNumber,
  index,
  annotations,
  onAddAnnotation,
  onRemoveAnnotation,
  tool,
  activeColor,
  activeWidth,
  scale,
  containerWidth
}: ScorePageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);

  const calculatedWidth = containerWidth * scale;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scaling factor: How much to scale from our reference system (1000px width)
    // to the actual displayed size on screen.
    const renderScale = calculatedWidth / 1000;

    ctx.save();
    ctx.scale(renderScale, renderScale);

    annotations.forEach((stroke) => {
      drawStroke(ctx, stroke.points, stroke.color, stroke.width, stroke.type);
    });

    if (currentStroke) {
      drawStroke(ctx, currentStroke, activeColor, activeWidth, tool === 'highlighter' ? 'highlighter' : 'pencil');
    }
    
    ctx.restore();
  }, [annotations, currentStroke, dimensions, calculatedWidth]);

  function drawStroke(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    width: number,
    type: 'pencil' | 'highlighter'
  ) {
    if (points.length === 0) return;

    // Use absolute units for getStroke, then the transform handles scaling
    const strokePoints = getStroke(points, {
      size: width,
      thinning: type === 'pencil' ? 0.5 : 0,
      smoothing: 0.5,
      streamline: 0.5,
    });

    if (strokePoints.length === 0) return;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.globalAlpha = type === 'highlighter' ? 0.4 : 1.0;

    const [firstX, firstY] = strokePoints[0];
    ctx.moveTo(firstX, firstY);

    for (let i = 1; i < strokePoints.length; i++) {
      const [x, y] = strokePoints[i];
      ctx.lineTo(x, y);
    }

    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Convert current pixel coordinate to reference coordinate (0-1000)
    const renderScale = calculatedWidth / 1000;
    const x = (e.clientX - rect.left) / renderScale;
    const y = (e.clientY - rect.top) / renderScale;

    if (tool === 'eraser') {
      const hitStroke = annotations.find(stroke => {
        // Eraser hit detection in reference space
        return stroke.points.some(p => Math.hypot(p.x - x, p.y - y) < 15);
      });
      if (hitStroke) {
        onRemoveAnnotation(hitStroke.id);
      }
      return;
    }

    setCurrentStroke([{ x, y, pressure: e.pressure || 0.5 }]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!currentStroke) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const renderScale = calculatedWidth / 1000;
    const x = (e.clientX - rect.left) / renderScale;
    const y = (e.clientY - rect.top) / renderScale;
    
    setCurrentStroke([...currentStroke, { x, y, pressure: e.pressure || 0.5 }]);
  };

  const handlePointerUp = () => {
    if (currentStroke && currentStroke.length > 1) {
      onAddAnnotation({
        id: crypto.randomUUID(),
        points: currentStroke,
        color: activeColor,
        width: activeWidth,
        type: tool === 'highlighter' ? 'highlighter' : 'pencil'
      });
    }
    setCurrentStroke(null);
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="relative flex flex-col items-center bg-white mb-2 last:mb-0"
    >
      <div 
        className="relative shadow-sm" 
        style={{ 
          width: calculatedWidth, 
          height: dimensions.width ? (dimensions.height * (calculatedWidth / dimensions.width)) : (calculatedWidth * 1.41)
        }}
      >
        <Page
          pageNumber={pageNumber}
          width={calculatedWidth}
          onLoadSuccess={(page) => {
            setDimensions({ width: page.width, height: page.height });
          }}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="shadow-none"
          loading={<div className="bg-slate-50 animate-pulse" style={{ width: calculatedWidth, height: calculatedWidth * 1.41 }} />}
        />
        
        <canvas
          ref={canvasRef}
          width={calculatedWidth}
          height={dimensions.width ? (dimensions.height * (calculatedWidth / dimensions.width)) : (calculatedWidth * 1.41)}
          className={`absolute inset-0 z-20 ${tool === 'pencil' || tool === 'highlighter' || tool === 'eraser' ? 'touch-none cursor-crosshair' : 'pointer-events-none'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/5 text-black/20 text-[9px] font-bold rounded select-none pointer-events-none">
          Pág {pageNumber}
        </div>
        
        {/* Only show drag handle if in navigation mode */}
        {tool === 'none' && (
          <div {...attributes} {...listeners} className="absolute left-0 top-0 bottom-0 w-12 cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 flex items-center justify-center bg-black/5 z-30 transition-opacity">
             <div className="flex flex-col gap-2">
               {[...Array(8)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-slate-400/50 rounded-full" />)}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
