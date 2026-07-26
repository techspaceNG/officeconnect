import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  Upload,
  Folder,
  File,
  Trash2,
  Share2,
  HardDrive,
  Clock,
  User,
  Eye,
  Download,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  Home,
  Check,
  X,
} from 'lucide-react';
import { apiRequest, apiDownloadBlob, apiUploadWithProgress, getApiUrl } from '../lib/api';
import { getSocket } from '../lib/socket';

interface FileCenterProps {
  user: any;
  onRefreshStats: () => void;
}

export default function FileCenter({ user, onRefreshStats }: FileCenterProps) {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: number | null; name: string }>>([
    { id: null, name: 'Root (All Files)' },
  ]);

  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);

  // Selection & Modals
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeShareFile, setActiveShareFile] = useState<any | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedShareUserIds, setSelectedShareUserIds] = useState<number[]>([]);

  const [activeVersionFileId, setActiveVersionFileId] = useState<number | null>(null);

  // Tab View: 'my-files' vs 'shared' vs 'recycle'
  const [activeView, setActiveView] = useState<'my-files' | 'shared' | 'recycle'>('my-files');
  const [recycleFiles, setRecycleFiles] = useState<any[]>([]);
  const [recycleFolders, setRecycleFolders] = useState<any[]>([]);
  const [sharedWithMeFiles, setSharedWithMeFiles] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fetchContents = async (folderId: number | null) => {
    setLoading(true);
    try {
      const url = folderId ? `/files/folder/contents?folderId=${folderId}` : '/files/folder/contents';
      const data = await apiRequest(url);
      setFolders(data.folders);
      setFiles(data.files);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecycleBin = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/files/recycle-bin');
      setRecycleFiles(data.files);
      setRecycleFolders(data.folders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedWithMe = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/files/shared-with-me');
      setSharedWithMeFiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const u = await apiRequest('/users');
      setAllUsers(u.filter((x: any) => x.id !== user.id));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeView === 'my-files') {
      fetchContents(currentFolderId);
    } else if (activeView === 'recycle') {
      fetchRecycleBin();
    } else if (activeView === 'shared') {
      fetchSharedWithMe();
    }

    const socket = getSocket();
    const handleFileSharedNotification = (data: any) => {
      if (data.sharedWithId === user.id) {
        if (activeView === 'shared') {
          fetchSharedWithMe();
        } else if (activeView === 'my-files') {
          fetchContents(currentFolderId);
        }
      }
    };

    socket.on('fileSharedNotification', handleFileSharedNotification);
    return () => {
      socket.off('fileSharedNotification', handleFileSharedNotification);
    };
  }, [currentFolderId, activeView, user]);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const handleOpenFolder = (fol: { id: number; name: string }) => {
    setCurrentFolderId(fol.id);
    setBreadcrumbs((prev) => [...prev, { id: fol.id, name: fol.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setCurrentFolderId(target.id);
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await apiRequest('/files/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName, parentId: currentFolderId }),
      });
      setNewFolderName('');
      setShowNewFolderModal(false);
      fetchContents(currentFolderId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setLoading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) {
      formData.append('folderId', String(currentFolderId));
    }

    try {
      await apiUploadWithProgress('/files/upload', formData, (progress) => {
        setUploadProgress(progress);
      });
      fetchContents(currentFolderId);
      onRefreshStats();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleUploadVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeVersionFileId) return;
    const file = e.target.files[0];
    
    setLoading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiUploadWithProgress(`/files/upload-version/${activeVersionFileId}`, formData, (progress) => {
        setUploadProgress(progress);
      });
      fetchContents(currentFolderId);
      onRefreshStats();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
      setUploadProgress(null);
      setActiveVersionFileId(null);
    }
  };

  const handleRecycleFile = async (id: number) => {
    if (!confirm('Move file to Recycle Bin?')) return;
    try {
      await apiRequest(`/files/recycle/file/${id}`, { method: 'POST' });
      fetchContents(currentFolderId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRecycleFolder = async (id: number) => {
    if (!confirm('Move folder to Recycle Bin? All contents inside will be recycled.')) return;
    try {
      await apiRequest(`/files/recycle/folder/${id}`, { method: 'POST' });
      fetchContents(currentFolderId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRestoreFile = async (id: number) => {
    try {
      await apiRequest(`/files/restore/file/${id}`, { method: 'POST' });
      fetchRecycleBin();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRestoreFolder = async (id: number) => {
    try {
      await apiRequest(`/files/restore/folder/${id}`, { method: 'POST' });
      fetchRecycleBin();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePermanentDeleteFile = async (id: number) => {
    if (!confirm('Permanently delete file? This action is irreversible.')) return;
    try {
      await apiRequest(`/files/permanent/file/${id}`, { method: 'DELETE' });
      fetchRecycleBin();
      onRefreshStats();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePermanentDeleteFolder = async (id: number) => {
    if (!confirm('Permanently delete folder and all contents inside? This is irreversible.')) return;
    try {
      await apiRequest(`/files/permanent/folder/${id}`, { method: 'DELETE' });
      fetchRecycleBin();
      onRefreshStats();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleShareSubmit = async () => {
    if (!activeShareFile || selectedShareUserIds.length === 0) return;
    try {
      await apiRequest('/files/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: activeShareFile.id,
          userIds: selectedShareUserIds,
        }),
      });

      const socket = getSocket();
      selectedShareUserIds.forEach((targetId) => {
        socket.emit('fileShared', {
          fileId: activeShareFile.id,
          fileName: activeShareFile.name,
          sharedWithId: targetId,
        });
      });

      alert('File successfully shared!');
      setShowShareModal(false);
      setActiveShareFile(null);
      setSelectedShareUserIds([]);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const blob = await apiDownloadBlob(`/files/download/${file.id}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">File Center</h1>
          <p className="text-xs text-muted-foreground font-medium">
            Centralized Document Management & Institution Storage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 bg-secondary/80 rounded-xl border border-border/60 flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveView('my-files')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeView === 'my-files'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Files
            </button>

            <button
              onClick={() => setActiveView('shared')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeView === 'shared'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Shared with Me
            </button>

            <button
              onClick={() => setActiveView('recycle')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeView === 'recycle'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Recycle Bin
            </button>
          </div>

          {activeView === 'my-files' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="apple-button-secondary text-xs flex items-center gap-1.5"
              >
                <FolderPlus size={14} />
                New Folder
              </button>

              <label className="apple-button text-xs flex items-center gap-1.5 cursor-pointer">
                <Upload size={14} />
                Upload File
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Floating Upload Progress Card */}
      {uploadProgress !== null && (
        <div className="fixed bottom-6 right-6 z-50 apple-card p-4 shadow-2xl border border-primary/30 bg-background/95 backdrop-blur-xl w-72 space-y-2 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="truncate">Uploading Document...</span>
            <span className="text-primary font-mono">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-150 ease-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* MAIN FILES VIEW */}
      {activeView === 'my-files' && (
        <div className="space-y-4">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/30 p-2.5 rounded-xl border border-border/40 overflow-x-auto">
            <Home size={14} className="shrink-0" />
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight size={12} className="shrink-0 text-muted-foreground/60" />
                <button
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`hover:text-primary transition-all truncate ${
                    idx === breadcrumbs.length - 1 ? 'font-bold text-foreground' : ''
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block mb-2"></span>
              <p>Loading files...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Folders Grid */}
              {folders.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Folders</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {folders.map((fol) => (
                      <div
                        key={fol.id}
                        onClick={() => handleOpenFolder(fol)}
                        className="apple-card p-3 rounded-2xl border border-border/60 hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <Folder size={18} />
                          </div>
                          <div className="truncate">
                            <h4 className="text-xs font-semibold truncate group-hover:text-primary">{fol.name}</h4>
                            <span className="text-[10px] text-muted-foreground">{fol.createdByUser?.fullName || 'Folder'}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRecycleFolder(fol.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-all"
                          title="Recycle Folder"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Files</h3>
                {files.length === 0 ? (
                  <div className="apple-card p-10 text-center text-xs text-muted-foreground border-dashed">
                    No files found in this directory. Click "Upload File" above to add documents.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="apple-card p-4 rounded-2xl border border-border/60 hover:border-primary/40 transition-all space-y-3 relative group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
                              <File size={16} />
                            </div>
                            <div className="truncate">
                              <h4 className="text-xs font-bold truncate">{file.name}</h4>
                              <span className="text-[10px] text-muted-foreground block">{formatBytes(file.sizeBytes)} • v{file.versions?.length || 1}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-muted-foreground flex items-center justify-between border-t border-border/40 pt-2">
                          <span>Owner: {file.createdByUser?.fullName}</span>
                          <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 pt-1 border-t border-border/40">
                          <button
                            onClick={() => handleDownload(file)}
                            className="flex-1 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                          >
                            <Download size={13} />
                            Download
                          </button>

                          <button
                            onClick={() => {
                              setActiveShareFile(file);
                              setShowShareModal(true);
                            }}
                            className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground"
                            title="Share File"
                          >
                            <Share2 size={13} />
                          </button>

                          <label className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer" title="Upload New Version">
                            <Upload size={13} />
                            <input
                              type="file"
                              onChange={(e) => {
                                setActiveVersionFileId(file.id);
                                handleUploadVersion(e);
                              }}
                              className="hidden"
                            />
                          </label>

                          <button
                            onClick={() => handleRecycleFile(file.id)}
                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-all"
                            title="Recycle File"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SHARED WITH ME VIEW */}
      {activeView === 'shared' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Files Shared With You</h3>
          {sharedWithMeFiles.length === 0 ? (
            <div className="apple-card p-10 text-center text-xs text-muted-foreground">
              No files have been shared with you yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sharedWithMeFiles.map((item) => {
                const file = item.file;
                return (
                  <div key={item.id} className="apple-card p-4 space-y-3 border border-border/60">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 font-bold">
                        <File size={16} />
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-bold truncate">{file.name}</h4>
                        <span className="text-[10px] text-muted-foreground">{formatBytes(file.sizeBytes)}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                      Shared by: <span className="font-semibold text-foreground">{file.createdByUser?.fullName}</span>
                    </div>

                    <button
                      onClick={() => handleDownload(file)}
                      className="w-full py-1.5 bg-primary text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all"
                    >
                      <Download size={13} />
                      Download Shared File
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RECYCLE BIN VIEW */}
      {activeView === 'recycle' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recycle Bin Items</h3>
          {recycleFiles.length === 0 && recycleFolders.length === 0 ? (
            <div className="apple-card p-10 text-center text-xs text-muted-foreground">
              Recycle bin is empty.
            </div>
          ) : (
            <div className="space-y-4">
              {recycleFolders.map((fol) => (
                <div key={fol.id} className="apple-card p-3 flex items-center justify-between border border-border/60">
                  <div className="flex items-center gap-3">
                    <Folder size={18} className="text-amber-500" />
                    <div>
                      <h4 className="text-xs font-semibold">{fol.name}</h4>
                      <span className="text-[10px] text-muted-foreground">Recycled Folder</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestoreFolder(fol.id)}
                      className="apple-button-secondary text-xs flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDeleteFolder(fol.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg text-xs"
                      title="Permanently Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {recycleFiles.map((file) => (
                <div key={file.id} className="apple-card p-3 flex items-center justify-between border border-border/60">
                  <div className="flex items-center gap-3">
                    <File size={18} className="text-primary" />
                    <div>
                      <h4 className="text-xs font-semibold">{file.name}</h4>
                      <span className="text-[10px] text-muted-foreground">{formatBytes(file.sizeBytes)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestoreFile(file.id)}
                      className="apple-button-secondary text-xs flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDeleteFile(file.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg text-xs"
                      title="Permanently Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NEW FOLDER MODAL */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="apple-card max-w-sm w-full p-6 space-y-4 shadow-2xl border border-border">
            <h3 className="text-sm font-bold">Create New Folder</h3>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder Name"
                required
                className="apple-input w-full"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="apple-button-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="apple-button text-xs">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE FILE MODAL */}
      {showShareModal && activeShareFile && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="apple-card max-w-md w-full p-6 space-y-4 shadow-2xl border border-border">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-bold">Share "{activeShareFile.name}"</h3>
              <button onClick={() => setShowShareModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Select Colleagues</label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border/40 rounded-xl p-2 bg-secondary/30">
                {allUsers.map((u) => {
                  const isSelected = selectedShareUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedShareUserIds(selectedShareUserIds.filter((id) => id !== u.id));
                        } else {
                          setSelectedShareUserIds([...selectedShareUserIds, u.id]);
                        }
                      }}
                      className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSelected ? 'bg-primary text-white font-medium' : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      <span>{u.fullName} (@{u.username})</span>
                      {isSelected && <Check size={14} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleShareSubmit}
              disabled={selectedShareUserIds.length === 0}
              className="apple-button w-full py-2.5 text-xs font-semibold mt-2"
            >
              Share File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
