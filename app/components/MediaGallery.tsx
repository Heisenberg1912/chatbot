'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Bookmark, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';

interface MediaItem {
  _id?: string;
  id: string;
  src: string;
  title: string;
  module: string;
  saved?: boolean;
  timestamp?: Date;
}

interface MediaGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  localMediaItems: MediaItem[];
  isLoggedIn: boolean;
  authFetch?: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function MediaGallery({ isOpen, onClose, localMediaItems, isLoggedIn, authFetch: authFetchProp }: MediaGalleryProps) {
  const doFetch = authFetchProp || fetch;
  const [activeTab, setActiveTab] = useState<'created' | 'saved'>('created');
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [dbMedia, setDbMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMedia = useCallback(async (tab: string) => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const res = await doFetch(`/api/media?tab=${tab}`);
      const data = await res.json();
      if (data.media) {
        setDbMedia(data.media.map((m: Record<string, unknown>) => ({
          id: m._id as string,
          _id: m._id as string,
          src: m.src as string,
          title: m.title as string,
          module: m.module as string,
          saved: m.saved as boolean,
        })));
      }
    } catch {
      // fallback to local items
      setDbMedia([]);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isOpen) {
      fetchMedia(activeTab);
    }
  }, [isOpen, activeTab, fetchMedia]);

  // Merge DB media with local session media, dedup by src
  const mergedItems = (() => {
    if (!isLoggedIn) return localMediaItems;
    if (activeTab === 'saved') return dbMedia;
    // For "created" tab: merge DB + local, dedup
    const dbSrcs = new Set(dbMedia.map(m => m.src.slice(0, 100)));
    const localOnly = localMediaItems.filter(m => !dbSrcs.has(m.src.slice(0, 100)));
    return [...dbMedia, ...localOnly];
  })();
  const displayItems = mergedItems;

  const downloadMedia = (item: MediaItem) => {
    const link = document.createElement('a');
    link.download = `${item.title.replace(/\s+/g, '_')}.png`;
    link.href = item.src;
    link.click();
  };

  const toggleSave = async (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn || !item._id) return;
    try {
      await doFetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item._id, saved: !item.saved }),
      });
      fetchMedia(activeTab);
    } catch { /* ignore */ }
  };

  const deleteMedia = async (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn || !item._id) return;
    try {
      await doFetch(`/api/media?id=${item._id}`, { method: 'DELETE' });
      fetchMedia(activeTab);
      if (previewItem?.id === item.id) setPreviewItem(null);
    } catch { /* ignore */ }
  };

  const renderMediaGrid = (items: MediaItem[]) => (
    <div className="columns-2 gap-3 space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="break-inside-avoid group relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-lighter cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-sm hover:shadow-md"
          onClick={() => setPreviewItem(item)}
        >
          <img src={item.src} alt={item.title} className="w-full object-cover" />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
            <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs font-medium truncate">{item.title}</p>
              <p className="text-white/60 text-[10px] mt-0.5">{item.module}</p>
            </div>
          </div>
          {/* Quick actions on hover */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isLoggedIn && item._id && (
              <>
                <button
                  onClick={(e) => toggleSave(item, e)}
                  className={`p-1.5 rounded-full transition-colors shadow-sm ${
                    item.saved
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-white/90 dark:bg-black/60 text-gray-700 dark:text-white hover:bg-white dark:hover:bg-black/80'
                  }`}
                  title={item.saved ? 'Unsave' : 'Save'}
                >
                  <Bookmark size={12} />
                </button>
                <button
                  onClick={(e) => deleteMedia(item, e)}
                  className="p-1.5 rounded-full bg-white/90 dark:bg-black/60 text-gray-700 dark:text-white hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadMedia(item);
              }}
              className="p-1.5 rounded-full bg-white/90 dark:bg-black/60 text-gray-700 dark:text-white hover:bg-white dark:hover:bg-black/80 transition-colors shadow-sm"
              title="Download"
            >
              <Download size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmpty = (message: string, sub: string) => (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-surface-lighter flex items-center justify-center mb-4">
        <ImageIcon size={28} className="text-gray-400 dark:text-content-subtle" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-content mb-1">{message}</p>
      <p className="text-xs text-gray-500 dark:text-content-muted leading-relaxed">{sub}</p>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[340px] bg-gray-50 dark:bg-surface-light border-l border-gray-200 dark:border-white/10 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-surface-lighter flex items-center justify-center">
              <ImageIcon size={16} className="text-gray-600 dark:text-content-muted" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">My Media</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-content-muted hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-6 px-5 py-3 border-b border-gray-200 dark:border-white/5">
          <button
            onClick={() => setActiveTab('created')}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
              activeTab === 'created'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-content-muted hover:text-gray-700 dark:hover:text-content'
            }`}
          >
            Created
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
              activeTab === 'saved'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-content-muted hover:text-gray-700 dark:hover:text-content'
            }`}
          >
            Saved
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-gray-400 dark:text-content-muted" />
            </div>
          ) : displayItems.length > 0 ? (
            renderMediaGrid(displayItems)
          ) : activeTab === 'created' ? (
            renderEmpty('No media yet', 'Generated floor plans and site analysis images will appear here.')
          ) : (
            renderEmpty('No saved media', 'Bookmark your favorite generated media to access them quickly.')
          )}
        </div>
      </div>

      {/* Full Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-6"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[85vh] bg-white dark:bg-surface-lighter rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/5">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{previewItem.title}</p>
                <p className="text-[11px] text-gray-500 dark:text-content-muted mt-0.5">{previewItem.module}</p>
              </div>
              <div className="flex items-center gap-2">
                {isLoggedIn && previewItem._id && (
                  <button
                    onClick={(e) => toggleSave(previewItem, e)}
                    className={`p-2 rounded-lg transition-colors ${
                      previewItem.saved
                        ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                        : 'text-gray-500 dark:text-content-muted hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title={previewItem.saved ? 'Unsave' : 'Save'}
                  >
                    <Bookmark size={16} />
                  </button>
                )}
                <button
                  onClick={() => downloadMedia(previewItem)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-content-muted hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-content-muted hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[calc(85vh-56px)] flex items-center justify-center bg-gray-100 dark:bg-surface p-4">
              <img
                src={previewItem.src}
                alt={previewItem.title}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
