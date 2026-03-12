'use client';

import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

interface FloorPlan {
  title: string;
  totalArea?: string;
  floorPlanImage?: string;
  rooms?: Array<{
    id: string;
    name: string;
    type: string;
    area: number;
    points: Array<{ x: number; y: number }>;
  }>;
}

export default function FloorPlanViewer({ plan }: { plan: Record<string, unknown> }) {
  const [zoom, setZoom] = useState(1);
  const fp = plan as unknown as FloorPlan;

  if (!fp.floorPlanImage && (!fp.rooms || fp.rooms.length === 0)) return null;

  const downloadPlan = () => {
    if (!fp.floorPlanImage) return;
    const link = document.createElement('a');
    link.download = `${fp.title || 'floorplan'}.png`;
    link.href = fp.floorPlanImage;
    link.click();
  };

  return (
    <div className="rounded-xl overflow-hidden border border-white/10">
      <div className="flex items-center justify-between px-3 py-2 bg-white/5">
        <span className="text-xs text-slate-400">{fp.title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            className="p-1 rounded hover:bg-white/10 text-slate-400"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] text-slate-500 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="p-1 rounded hover:bg-white/10 text-slate-400"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1 rounded hover:bg-white/10 text-slate-400"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={downloadPlan}
            className="p-1 rounded hover:bg-white/10 text-slate-400"
          >
            <Download size={14} />
          </button>
        </div>
      </div>
      <div className="overflow-auto max-h-[600px] bg-white flex items-center justify-center p-2">
        {fp.floorPlanImage ? (
          <img
            src={fp.floorPlanImage}
            alt={fp.title || 'Floor Plan'}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease',
              maxWidth: '100%',
            }}
            className="rounded"
          />
        ) : (
          <div className="text-slate-400 text-sm p-8">
            No floor plan image available. Room data is listed in the text above.
          </div>
        )}
      </div>
    </div>
  );
}
