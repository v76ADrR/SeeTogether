import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Disc, FileText, FolderOpen, Image, Paperclip, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  clearPortalHandle,
  ensureInboxDirs,
  isDirectoryPickerSupported,
  loadPortalHandle,
  pickPortalFolder,
  revalidatePortalHandle,
} from './portal-fs';
import {saveToProjectUpload} from './local-upload';

export type SessionFileCategory = 'summary' | 'picture' | 'media';

export interface SessionFile {
  id: string;
  name: string;
  category: SessionFileCategory;
  size: number;
  type: string;
  file?: File;
  addedAt: number;
}

interface UploadSessionProps {
  files: SessionFile[];
  onAddFiles: (files: File[], category?: SessionFileCategory) => void;
  onRemoveFile: (id: string) => void;
  onChangeCategory: (id: string, category: SessionFileCategory) => void;
  onClearFiles: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function inferCategory(filename: string, mimeType: string): SessionFileCategory {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || mimeType.startsWith('image/')) return 'picture';
  if (['dcm', 'zip', 'tar', 'gz'].includes(ext)) return 'media';
  if (['pdf', 'txt', 'docx', 'doc', 'rtf'].includes(ext) || mimeType.includes('text') || mimeType.includes('pdf')) return 'summary';
  return 'media';
}

const CATEGORY_META = {
  summary: {
    label: 'Summary page',
    sub: 'Imaging summary document (.pdf, .txt)',
    accept: '.pdf,.txt,.doc,.docx,.rtf',
    icon: FileText,
    color: '#65717e',
  },
  picture: {
    label: 'Picture capture',
    sub: 'Film / report photo (.jpg, .png, .webp)',
    accept: '.jpg,.jpeg,.png,.webp,image/*',
    icon: Image,
    color: '#65717e',
  },
  media: {
    label: 'Media (disc export)',
    sub: 'MRI disc export / archive (.dcm, .zip, etc.)',
    accept: '.dcm,.zip,.tar,.gz,.pdf,.png,.jpg,.jpeg',
    icon: Disc,
    color: '#458a85',
  },
};

// Track permission state: 'granted' | 'prompt' | 'denied' | null (unknown / loading)
type PermState = 'granted' | 'prompt' | null;

export function UploadSession({
  files,
  onAddFiles,
  onRemoveFile,
  onChangeCategory,
  onClearFiles,
}: UploadSessionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const generalInputRef = useRef<HTMLInputElement>(null);
  const catInputRef = useRef<HTMLInputElement>(null);
  const [activeCat, setActiveCat] = useState<SessionFileCategory | undefined>(undefined);

  // Portal state — use a ref so callbacks always see latest value without re-memo
  const [portalHandle, setPortalHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const portalHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [portalName, setPortalName] = useState<string | null>(null);
  const [permState, setPermState] = useState<PermState>(null);
  const [portalLoading, setPortalLoading] = useState(true);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [writeStatus, setWriteStatus] = useState<{ errors: string[]; okPaths: string[] }>({ errors: [], okPaths: [] });

  const pickerSupport = isDirectoryPickerSupported();

  // Keep ref in sync with state
  useEffect(() => { portalHandleRef.current = portalHandle; }, [portalHandle]);

  // Load handle on mount — queryPermission() does NOT need a gesture
  useEffect(() => {
    (async () => {
      const h = await loadPortalHandle();
      if (h) {
        setPortalHandle(h);
        setPortalName(h.name);
        try {
          const perm = typeof (h as any).queryPermission === 'function'
            ? await (h as any).queryPermission({ mode: 'readwrite' })
            : 'granted';
          setPermState(perm === 'granted' ? 'granted' : 'prompt');
        } catch {
          setPermState('prompt');
        }
      } else {
        setPermState(null);
      }
      setPortalLoading(false);
    })();
  }, []);

  /** Called from a click handler — safe to call requestPermission() */
  const handleLinkPortal = async () => {
    setPortalError(null);
    const res = await pickPortalFolder();
    if (res.ok) {
      setPortalHandle(res.handle);
      setPortalName(res.handle.name);
      setPermState('granted');
      setPortalError(null);
    } else if (res.reason === 'unsupported' || res.reason === 'error') {
      setPortalError(res.message);
    }
  };

  /** Re-authorise an already-stored handle (requires user gesture) */
  const handleReauthorise = async () => {
    if (!portalHandle) return;
    setPortalError(null);
    const res = await revalidatePortalHandle(portalHandle);
    if (res.ok) {
      await ensureInboxDirs(portalHandle);
      setPermState('granted');
      setPortalError(null);
    } else {
      setPermState('prompt');
      setPortalError(res.message);
    }
  };

  const handleClearPortal = async () => {
    await clearPortalHandle();
    setPortalHandle(null);
    setPortalName(null);
    setPermState(null);
    setPortalError(null);
  };

  // Submit / drop save: flat write into SeeTogether/Upload via local Vite API (no cloud, no classification).
  const [submitPending, setSubmitPending] = useState(false);
  const saveFilesToUpload = useCallback(async (list: {name: string; file?: File}[]) => {
    const errors: string[] = [];
    const okPaths: string[] = [];
    for (const sf of list) {
      if (!sf.file) {
        errors.push(sf.name);
        continue;
      }
      try {
        const path = await saveToProjectUpload(sf.file);
        okPaths.push(path);
        console.info('[upload] saved', path);
      } catch (e: any) {
        errors.push(sf.name);
        console.error('[upload] save failed', sf.name, e);
      }
    }
    return {errors, okPaths};
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitPending || files.length === 0) return;
    setSubmitPending(true);
    setPortalError(null);
    const {errors, okPaths} = await saveFilesToUpload(files);
    setSubmitPending(false);
    setWriteStatus({ errors, okPaths });
    setTimeout(() => setWriteStatus({ errors: [], okPaths: [] }), 8000);
  }, [files, submitPending, saveFilesToUpload]);

  // Add: React state only. Portal write happens on Submit, not on add.
  const handleAddWithPortal = useCallback((newFiles: File[], cat?: SessionFileCategory) => {
    onAddFiles(newFiles, cat);
  }, [onAddFiles]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const persistDropped = useCallback(async (fileList: File[], cat?: SessionFileCategory) => {
    handleAddWithPortal(fileList, cat);
    setIsOpen(true);
    setSubmitPending(true);
    setPortalError(null);
    const {errors, okPaths} = await saveFilesToUpload(fileList.map(f => ({name: f.name, file: f})));
    setSubmitPending(false);
    setWriteStatus({ errors, okPaths });
    setTimeout(() => setWriteStatus({ errors: [], okPaths: [] }), 8000);
  }, [handleAddWithPortal, saveFilesToUpload]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    if (e.dataTransfer.files?.length) { void persistDropped(Array.from(e.dataTransfer.files)); }
  };
  const handleGeneralSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) { void persistDropped(Array.from(e.target.files)); e.target.value = ''; }
  };
  const handleCatSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) { void persistDropped(Array.from(e.target.files), activeCat); e.target.value = ''; }
  };
  const triggerCatPicker = (cat: SessionFileCategory) => {
    setActiveCat(cat);
    if (catInputRef.current) { catInputRef.current.accept = CATEGORY_META[cat].accept; catInputRef.current.click(); }
  };

  const isLinkedAndGranted = !!portalHandle && permState === 'granted';
  const isLinkedNeedsAuth = !!portalHandle && permState === 'prompt';
  const canSubmit = files.length > 0 && !submitPending;

  return (
    <div className="upload-session-container">
      <input ref={generalInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleGeneralSelect} />
      <input ref={catInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleCatSelect} />

      {isOpen && (
        <div
          className={`upload-session-panel glass ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="Upload session panel"
        >
          {/* Header */}
          <div className="upload-panel-header">
            <div className="upload-header-left">
              <Upload size={14} className="text-muted-foreground" />
              <span className="upload-panel-title">Upload session</span>
              <Badge variant="outline" className="upload-badge">Local only</Badge>
            </div>
            <div className="upload-header-actions">
              {files.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    className="upload-submit-btn header"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    title={
                      !isLinkedAndGranted
                        ? 'Save staged files into SeeTogether/Upload'
                        : `Submit ${files.length} file(s) to portal`
                    }
                    aria-label="Submit files to portal"
                  >
                    {submitPending ? 'Saving…' : 'Submit'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="upload-clear-btn"
                    onClick={onClearFiles}
                    title="Remove all files"
                    aria-label="Remove all files"
                  >
                    Clear ({files.length})
                  </Button>
                </>
              )}
              <Button variant="ghost" className="upload-close-btn" onClick={() => setIsOpen(false)} title="Collapse" aria-label="Collapse upload session">
                <ChevronDown size={15} />
              </Button>
            </div>
          </div>

          {/* Portal link row */}
          <div className="upload-portal-row">
            {portalLoading ? (
              <span className="upload-portal-hint">Checking portal…</span>
            ) : isLinkedAndGranted ? (
              <>
                <span className="upload-portal-linked">
                  <FolderOpen size={12} />
                  <span>{portalName || 'human-atlas-portal'}</span>
                  <span className="upload-portal-path-sub">…/SeeTogether/Upload</span>
                </span>
                <button type="button" className="upload-portal-change" onClick={handleLinkPortal} title="Pick a different portal folder">Change…</button>
                <button type="button" className="upload-portal-clear" onClick={handleClearPortal} title="Unlink portal folder" aria-label="Unlink"><X size={11} /></button>
              </>
            ) : isLinkedNeedsAuth ? (
              <>
                <span className="upload-portal-hint" style={{ color: '#a8574a' }}>Portal needs permission.</span>
                <button type="button" className="upload-portal-link-btn" style={{ background: '#a8574a12', color: '#a8574a', borderColor: '#a8574a18' }} onClick={handleReauthorise}>Reauthorise</button>
                <button type="button" className="upload-portal-clear" onClick={handleClearPortal} title="Unlink" aria-label="Unlink"><X size={11} /></button>
              </>
            ) : !pickerSupport.supported ? (
              <>
                <span className="upload-portal-hint" style={{ color: '#a8574a' }}>
                  {pickerSupport.message}
                </span>
              </>
            ) : (
              <>
                <span className="upload-portal-hint">
                  Target: <code className="upload-portal-path">…/SeeTogether/Upload</code>
                </span>
                <button type="button" className="upload-portal-link-btn" onClick={handleLinkPortal} title="Link SeeTogether/Upload to save files to disk">Link portal folder</button>
              </>
            )}
          </div>

          {/* Description / nudge */}
          <p className="upload-panel-desc">
            {isLinkedAndGranted
              ? 'Saves into SeeTogether/Upload on drop or Submit. No cloud.'
              : files.length > 0
                ? 'Drop or Submit writes into SeeTogether/Upload.'
                : 'Local-only. Files land in SeeTogether/Upload.'}
          </p>

          {/* Portal error / status feedback */}
          {portalError && (
            <div className="upload-portal-error">{portalError}</div>
          )}
          {writeStatus.errors.length > 0 && (
            <div className="upload-portal-error">Failed to write: {writeStatus.errors.join(', ')}</div>
          )}
          {writeStatus.okPaths.length > 0 && (
            <div className="upload-portal-ok">Saved {writeStatus.okPaths.length} file(s) to portal: {writeStatus.okPaths.join(', ')}</div>
          )}

          {/* Category cards */}
          <div className="upload-categories-grid">
            {(['summary', 'picture', 'media'] as SessionFileCategory[]).map(cat => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const catCount = files.filter(f => f.category === cat).length;
              return (
                <button key={cat} type="button" className="upload-cat-card" onClick={() => triggerCatPicker(cat)} title={`Add ${meta.label}`}>
                  <div className="upload-cat-top">
                    <Icon size={14} style={{ color: meta.color }} />
                    <span className="upload-cat-label">{meta.label}</span>
                    {catCount > 0 && <span className="upload-cat-badge">{catCount}</span>}
                  </div>
                  <div className="upload-cat-sub">{meta.sub}</div>
                </button>
              );
            })}
          </div>

          {/* Dropzone */}
          <div className="upload-dropzone" onClick={() => generalInputRef.current?.click()}>
            <Paperclip size={13} />
            <span>Drop files here or <b>browse</b></span>
            <span className="upload-formats-hint">(.pdf · .jpg · .png · .webp · .dcm · .zip)</span>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="upload-files-section">
              <div className="upload-files-list">
                {files.map(f => {
                  const meta = CATEGORY_META[f.category];
                  const Icon = meta.icon;
                  return (
                    <div key={f.id} className="upload-file-row">
                      <Icon size={13} style={{ color: meta.color, flexShrink: 0 }} />
                      <span className="upload-file-name" title={f.name}>{f.name}</span>
                      <select
                        value={f.category}
                        onChange={e => onChangeCategory(f.id, e.target.value as SessionFileCategory)}
                        className="upload-file-cat-select"
                        title="Change category"
                        aria-label="Change category"
                      >
                        <option value="summary">Summary</option>
                        <option value="picture">Picture</option>
                        <option value="media">Media</option>
                      </select>
                      <span className="upload-file-size">{formatFileSize(f.size)}</span>
                      <button type="button" className="upload-file-remove" onClick={() => onRemoveFile(f.id)} title={`Remove ${f.name}`} aria-label={`Remove ${f.name}`}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Submit footer bar */}
              <div className="upload-submit-bar">
                <Button
                  className="upload-submit-btn"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  title={
                    !isLinkedAndGranted
                      ? 'Save staged files into SeeTogether/Upload to disk'
                      : `Save ${files.length} file(s) to Upload/`
                  }
                >
                  <Check size={13} />
                  <span>{submitPending ? 'Saving…' : `Submit (${files.length}) to Upload`}</span>
                </Button>
                {!isLinkedAndGranted && (
                  <span className="upload-submit-nudge">
                    Destination: SeeTogether/Upload
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dock chip */}
      <Button
        variant="ghost"
        className={`upload-dock-chip ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="Toggle upload session"
        title="Upload session (local only)"
      >
        <Upload size={14} />
        <span>Upload session</span>
        {files.length > 0 ? (
          <Badge variant="secondary" className="upload-chip-count">{files.length}</Badge>
        ) : (
          <span className={`upload-chip-local ${isLinkedAndGranted ? 'linked' : ''}`}>
            {isLinkedAndGranted ? 'Portal' : 'Upload'}
          </span>
        )}
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </Button>
    </div>
  );
}
