import React, { useState, useRef } from 'react';
import { Folder, FileText, ArrowLeft, Upload, FolderPlus, Trash2, RotateCcw, Download, Plus, HardDrive, Share2 } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface FileCenterProps {
  user: any;
  onRefreshStats: () => void;
}

export default function FileCenter({ user, onRefreshStats }: FileCenterProps) {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [inRecycleBin, setInRecycleBin] = useState<boolean>(false);
  const [inSharedView, setInSharedView] = useState<boolean>(false);
  
  const [recycledFolders, setRecycledFolders] = useState<any[]>([]);
  const [recycledFiles, setRecycledFiles] = useState<any[]>([]);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);

  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareFileId, setShareFileId] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fetchSharedWithMe = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/files/shared-with-me');
      setSharedFiles(data || []);
      setInSharedView(true);
      setInRecycleBin(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiRequest('/users');
      setUsers(data.filter((u: any) => u.id !== user.id));
    } catch (e) {
      console.error(e);
    }
  };

  const triggerShareModal = (fileId: number) => {
    setShareFileId(fileId);
    fetchUsers();
    setShowShareModal(true);
  };

  const handleShareSubmit = async (targetUserId: number) => {
    if (!shareFileId) return;
    setLoading(true);
    try {
      await apiRequest('/files/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: shareFileId, sharedWithId: targetUserId }),
      });
      setShowShareModal(false);
      setShareFileId(null);
      alert('File shared successfully!');
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const versionInputRef = useRef<HTMLInputElement>(null);
  const [activeVersionFileId, setActiveVersionFileId] = useState<number | null>(null);

  const fetchContents = async (folderId: number | null) => {
    setLoading(true);
    try {
      const url = folderId ? `/files/folder/contents?folderId=${folderId}` : '/files/folder/contents';
      const data = await apiRequest(url);
      setFolders(data.folders || []);
      setFiles(data.files || []);
      setBreadcrumbs(data.breadcrumbs || []);
      setInRecycleBin(false);
      setInSharedView(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecycleBin = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/files/recycle-bin');
      setRecycledFolders(data.folders || []);
      setRecycledFiles(data.files || []);
      setInRecycleBin(true);
      setInSharedView(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchContents(currentFolderId);
  }, [currentFolderId]);

  const handleCreateFolder = async () => {
    const name = prompt('Enter folder name:');
    if (!name) return;

    try {
      await apiRequest('/files/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId: currentFolderId }),
      });
      fetchContents(currentFolderId);
    } catch (e) {
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
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) {
      formData.append('folderId', String(currentFolderId));
    }

    try {
      await apiRequest('/files/upload', {
        method: 'POST',
        body: formData,
      });
      fetchContents(currentFolderId);
      onRefreshStats();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeVersionFileId) return;
    const file = e.target.files[0];
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiRequest(`/files/upload-version/${activeVersionFileId}`, {
        method: 'POST',
        body: formData,
      });
      fetchContents(currentFolderId);
      onRefreshStats();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
      setActiveVersionFileId(null);
    }
  };

  const handleRecycleFile = async (id: number) => {
    if (!confirm('Move file to Recycle Bin?')) return;
    try {
      await apiRequest(`/files/recycle/file/${id}`, { method: 'POST' });
      fetchContents(currentFolderId);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRecycleFolder = async (id: number) => {
    if (!confirm('Move folder to Recycle Bin? All contents inside will be recycled.')) return;
    try {
      await apiRequest(`/files/recycle/folder/${id}`, { method: 'POST' });
      fetchContents(currentFolderId);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRestoreFile = async (id: number) => {
    try {
      await apiRequest(`/files/restore/file/${id}`, { method: 'POST' });
      fetchRecycleBin();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRestoreFolder = async (id: number) => {
    try {
      await apiRequest(`/files/restore/folder/${id}`, { method: 'POST' });
      fetchRecycleBin();
    } catch (e) {
      alert(e.message);
    }
  };

  const handlePermanentDeleteFile = async (id: number) => {
    if (!confirm('Permanently delete file? This action is irreversible.')) return;
    try {
      await apiRequest(`/files/permanent/file/${id}`, { method: 'DELETE' });
      fetchRecycleBin();
      onRefreshStats();
    } catch (e) {
      alert(e.message);
    }
  };

  const handlePermanentDeleteFolder = async (id: number) => {
    if (!confirm('Permanently delete folder and all contents inside? This is irreversible.')) return;
    try {
      await apiRequest(`/files/permanent/folder/${id}`, { method: 'DELETE' });
      fetchRecycleBin();
      onRefreshStats();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDownload = async (fileId: number, fileName: string) => {
    try {
      const blob = await apiRequest(`/files/download/${fileId}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-5 select-none">
      {/* macOS Finder Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <HardDrive className="text-primary" size={22} />
            File Center
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Exchange ICT department documents instantly over local intranet.
          </p>
        </div>

        {/* macOS Segmented Tab Navigation */}
        <div className="flex items-center gap-3">
          <div className="apple-segmented-control">
            <button
              onClick={() => fetchContents(null)}
              className={`apple-segmented-item ${!inRecycleBin && !inSharedView ? 'apple-segmented-item-active' : ''}`}
            >
              My Files
            </button>
            <button
              onClick={fetchSharedWithMe}
              className={`apple-segmented-item ${inSharedView ? 'apple-segmented-item-active' : ''}`}
            >
              Shared with Me
            </button>
            <button
              onClick={fetchRecycleBin}
              className={`apple-segmented-item ${inRecycleBin ? 'apple-segmented-item-active' : ''}`}
            >
              Recycle Bin
            </button>
          </div>

          {!inRecycleBin && !inSharedView && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateFolder}
                className="apple-button-secondary text-xs"
              >
                <FolderPlus size={14} />
                New Folder
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="apple-button text-xs"
              >
                <Upload size={14} />
                Upload
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <input
                type="file"
                ref={versionInputRef}
                onChange={handleUploadVersion}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* macOS Breadcrumb Trail */}
      {!inRecycleBin && !inSharedView && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1 px-1">
          <span
            onClick={() => setCurrentFolderId(null)}
            className="hover:text-primary cursor-pointer font-medium"
          >
            Root
          </span>
          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.id}>
              <span>/</span>
              <span
                onClick={() => setCurrentFolderId(crumb.id)}
                className="hover:text-primary cursor-pointer font-medium truncate max-w-[120px]"
              >
                {crumb.name}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Drag & Drop Main Viewport */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col min-h-[420px] rounded-2xl p-6 transition-all border-2 border-dashed ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border/60 bg-card/50'
        }`}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-2xl backdrop-blur-xs">
            <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>
          </div>
        )}

        {inRecycleBin ? (
          /* Recycle Bin View */
          <div className="space-y-5">
            <h2 className="text-xs font-semibold text-destructive uppercase tracking-wider flex items-center gap-2">
              <Trash2 size={16} />
              Recycle Bin
            </h2>

            {recycledFolders.length === 0 && recycledFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <Trash2 size={40} className="stroke-[1.2] mb-2 opacity-50" />
                <p className="text-xs font-semibold">Recycle Bin is empty</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recycledFolders.map((fol) => (
                  <div key={fol.id} className="apple-card p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3 truncate">
                      <Folder className="text-amber-500 fill-amber-500/20 shrink-0" size={20} />
                      <span className="font-medium text-xs truncate">{fol.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleRestoreFolder(fol.id)}
                        className="p-1.5 hover:bg-secondary text-emerald-500 rounded-lg transition-all"
                        title="Restore"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => handlePermanentDeleteFolder(fol.id)}
                        className="p-1.5 hover:bg-secondary text-destructive rounded-lg transition-all"
                        title="Delete Permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {recycledFiles.map((fi) => (
                  <div key={fi.id} className="apple-card p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3 truncate">
                      <FileText className="text-primary shrink-0" size={20} />
                      <div className="truncate">
                        <p className="font-semibold text-xs truncate">{fi.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatBytes(fi.size)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleRestoreFile(fi.id)}
                        className="p-1.5 hover:bg-secondary text-emerald-500 rounded-lg transition-all"
                        title="Restore"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => handlePermanentDeleteFile(fi.id)}
                        className="p-1.5 hover:bg-secondary text-destructive rounded-lg transition-all"
                        title="Delete Permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : inSharedView ? (
          /* Shared with Me View */
          <div className="space-y-5 flex-1">
            <h2 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
              <Share2 size={16} />
              Files Received (Shared with Me)
            </h2>

            {sharedFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-muted-foreground">
                <FileText size={40} className="stroke-[1.2] mb-2 opacity-50" />
                <p className="text-xs font-semibold">No files shared with you yet</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sharedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="apple-card p-4 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="text-primary shrink-0" size={18} />
                          <h4 className="font-semibold text-xs truncate" title={file.name}>
                            {file.name}
                          </h4>
                        </div>
                        <span className="text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase shrink-0">
                          v{file.versions?.length || 1}
                        </span>
                      </div>
                      <div className="mt-3 text-[11px] text-muted-foreground space-y-0.5">
                        <p>Size: {formatBytes(file.size)}</p>
                        <p>Sender: {file.createdBy?.fullName}</p>
                        <p>Received: {new Date(file.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/40 flex justify-end">
                      <button
                        onClick={() => handleDownload(file.id, file.name)}
                        className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-secondary transition-all"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Standard Finder View */
          <div className="flex-1 flex flex-col">
            {folders.length === 0 && files.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-muted-foreground">
                <Upload size={40} className="stroke-[1.2] mb-2 opacity-50 animate-bounce" />
                <p className="text-xs font-semibold">Drag files here, or click Upload above</p>
                <p className="text-[10px] mt-1 text-muted-foreground/60">LAN File Limit: 50MB per file</p>
              </div>
            ) : (
              <div className="space-y-6 flex-1">
                {/* Folders Section */}
                {folders.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">Folders</h3>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {folders.map((folder) => (
                        <div
                          key={folder.id}
                          className="apple-card p-3.5 flex items-center justify-between group cursor-pointer"
                        >
                          <div
                            onClick={() => setCurrentFolderId(folder.id)}
                            className="flex items-center gap-3 truncate flex-1 pr-2"
                          >
                            <Folder className="text-amber-500 fill-amber-500/20 shrink-0" size={20} />
                            <div className="truncate">
                              <p className="font-semibold text-xs truncate">{folder.name}</p>
                              <p className="text-[9px] text-muted-foreground">
                                By: {folder.createdBy?.fullName}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecycleFolder(folder.id);
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive rounded-lg hover:bg-secondary opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            title="Recycle"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files Section */}
                {files.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">Files</h3>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="apple-card p-4 flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="text-primary shrink-0" size={18} />
                                <h4 className="font-semibold text-xs truncate" title={file.name}>
                                  {file.name}
                                </h4>
                              </div>
                              <span className="text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase shrink-0">
                                v{file.versions?.length || 1}
                              </span>
                            </div>
                            <div className="mt-3 text-[11px] text-muted-foreground space-y-0.5">
                              <p>Size: {formatBytes(file.size)}</p>
                              <p>Owner: {file.createdBy?.fullName}</p>
                              <p>Date: {new Date(file.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setActiveVersionFileId(file.id);
                                  versionInputRef.current?.click();
                                }}
                                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                              >
                                <Plus size={11} />
                                Version
                              </button>
                              <button
                                onClick={() => triggerShareModal(file.id)}
                                className="text-[11px] font-semibold text-primary hover:underline"
                              >
                                Share
                              </button>
                            </div>
                            <div className="flex gap-0.5">
                              <button
                                onClick={() => handleDownload(file.id, file.name)}
                                className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-secondary transition-all"
                                title="Download"
                              >
                                <Download size={13} />
                              </button>
                              <button
                                onClick={() => handleRecycleFile(file.id)}
                                className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-secondary transition-all"
                                title="Recycle"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Document Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
          <div className="apple-card w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold">Share Document</h3>
            <p className="text-xs text-muted-foreground">Select a department colleague to share this file with.</p>
            
            <div className="max-h-[180px] overflow-y-auto border border-border/60 rounded-xl p-2 space-y-1 bg-secondary/30">
              {users.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">No other staff members registered.</p>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleShareSubmit(u.id)}
                    className="flex items-center justify-between p-2.5 hover:bg-secondary rounded-lg cursor-pointer transition-all border border-transparent hover:border-border/60"
                  >
                    <div>
                      <div className="text-xs font-semibold">{u.fullName}</div>
                      <div className="text-[10px] text-muted-foreground">@{u.username}</div>
                    </div>
                    <span className="text-[10px] font-bold text-primary">Share</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border/40">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareFileId(null);
                }}
                className="apple-button-secondary text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
