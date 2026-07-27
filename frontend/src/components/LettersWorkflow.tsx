import React, { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  ExternalLink,
  Paperclip,
  RotateCcw,
  Eye,
  UserCheck,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { apiRequest, getApiUrl } from '../lib/api';

interface LettersWorkflowProps {
  user: any;
  onRefreshStats: () => void;
}

export default function LettersWorkflow({ user, onRefreshStats }: LettersWorkflowProps) {
  const [letters, setLetters] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [activeLetter, setActiveLetter] = useState<any | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [recipientId, setRecipientId] = useState<number | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reviewerRemarks, setReviewerRemarks] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor');

  const fetchLetters = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/letters');
      setLetters(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const users = await apiRequest('/users');
      setStaffList(users.filter((u: any) => u.id !== user.id));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLetters();
    fetchStaff();
  }, []);

  const handleSelectLetter = (lettr: any) => {
    setActiveLetter(lettr);
    setTitle(lettr.title);
    setContent(lettr.content);
    setRecipientId(lettr.recipientId || lettr.approverId || '');
    setReviewerRemarks(lettr.remarks || '');
    setSelectedFile(null);
  };

  const handleNewLetter = () => {
    setActiveLetter(null);
    setTitle('New Official Correspondence');
    setContent('');
    setRecipientId('');
    setReviewerRemarks('');
    setSelectedFile(null);
    setPreviewTab('editor');
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      if (recipientId) formData.append('recipientId', recipientId.toString());
      if (selectedFile) formData.append('attachment', selectedFile);

      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/letters${activeLetter ? `/${activeLetter.id}` : ''}`, {
        method: activeLetter ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to save correspondence');
      }

      const resData = await response.json();
      if (activeLetter) {
        setLetters((prev) => prev.map((l) => (l.id === activeLetter.id ? resData : l)));
      } else {
        setLetters((prev) => [resData, ...prev]);
      }
      setActiveLetter(resData);
      setSelectedFile(null);
      onRefreshStats();
      alert('Correspondence saved successfully.');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApproval = async () => {
    if (!activeLetter) return;
    setLoading(true);

    try {
      const updated = await apiRequest(`/letters/${activeLetter.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: recipientId || undefined }),
      });
      setLetters((prev) => prev.map((l) => (l.id === activeLetter.id ? updated : l)));
      setActiveLetter(updated);
      onRefreshStats();
      alert('Correspondence submitted for review!');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!activeLetter) return;
    const remarks = reviewerRemarks.trim() || prompt('Enter remarks for revision:');
    if (!remarks) return;

    setLoading(true);
    try {
      const updated = await apiRequest(`/letters/${activeLetter.id}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks }),
      });
      setLetters((prev) => prev.map((l) => (l.id === activeLetter.id ? updated : l)));
      setActiveLetter(updated);
      onRefreshStats();
      alert('Correspondence sent back for adjustment.');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!activeLetter) return;
    setLoading(true);

    try {
      const updated = await apiRequest(`/letters/${activeLetter.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: reviewerRemarks }),
      });
      setLetters((prev) => prev.map((l) => (l.id === activeLetter.id ? updated : l)));
      setActiveLetter(updated);
      onRefreshStats();
      alert('Correspondence officially approved and stamped!');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 uppercase">
            <CheckCircle2 size={10} />
            Approved
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 uppercase animate-pulse">
            <Clock size={10} />
            Under Review
          </span>
        );
      case 'NEEDS_REVISION':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20 uppercase">
            <RotateCcw size={10} />
            Needs Revision
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20 uppercase">
            <XCircle size={10} />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 bg-secondary text-muted-foreground rounded-full border border-border/40 uppercase">
            <FileText size={10} />
            Draft
          </span>
        );
    }
  };

  const filteredLetters = letters.filter(
    (l) =>
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.referenceNumber && l.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const canEdit = !activeLetter || activeLetter.status === 'DRAFT' || activeLetter.status === 'NEEDS_REVISION' || activeLetter.status === 'REJECTED';
  const canReview = activeLetter && activeLetter.status === 'PENDING_APPROVAL' && (user.role === 'SUPER_ADMIN' || user.role === 'DIRECTOR' || activeLetter.recipientId === user.id);

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col md:flex-row apple-card overflow-hidden select-none">
      {/* Sidebar List */}
      <div className="w-full md:w-80 h-56 md:h-auto border-r border-border/60 flex flex-col bg-secondary/30 shrink-0">
        <div className="p-3.5 border-b border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight">Correspondence</h2>
            <button
              onClick={handleNewLetter}
              className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
              title="Draft New Correspondence"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-muted-foreground" size={13} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search correspondence..."
              className="apple-input w-full pl-8 py-1 text-xs rounded-lg"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {filteredLetters.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">No correspondence found.</p>
          ) : (
            filteredLetters.map((lettr) => (
              <div
                key={lettr.id}
                onClick={() => handleSelectLetter(lettr)}
                className={`p-3 rounded-xl cursor-pointer transition-all flex flex-col gap-1 relative border ${
                  activeLetter?.id === lettr.id
                    ? 'border-primary/50 bg-primary/10 shadow-sm'
                    : 'border-transparent hover:bg-secondary/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-xs truncate flex-1">{lettr.title}</h4>
                  <span className="shrink-0">{getStatusBadge(lettr.status)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>Author: {lettr.createdBy?.fullName || 'Me'}</span>
                  {lettr.recipient && <span>To: {lettr.recipient.fullName}</span>}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span className="text-[9px] text-primary font-bold">
                    {lettr.referenceNumber || 'DRAFT'}
                  </span>
                  <span>{new Date(lettr.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Document Pane */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20 backdrop-blur-xs">
            <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>
          </div>
        )}

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-border/40 flex flex-wrap items-center justify-between bg-background/80 backdrop-blur-md gap-2">
          <div className="flex items-center gap-3">
            <Send size={16} className="text-primary" />
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Official Correspondence Workspace
            </span>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-secondary p-0.5 rounded-lg border border-border/40 ml-2">
              <button
                onClick={() => setPreviewTab('editor')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  previewTab === 'editor' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setPreviewTab('preview')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  previewTab === 'preview' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Document Preview
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={handleSave}
                  className="apple-button-secondary text-xs py-1.5 px-3"
                >
                  <Save size={13} />
                  Save Draft
                </button>
                {activeLetter && (
                  <button
                    onClick={handleSubmitApproval}
                    className="apple-button text-xs py-1.5 px-3"
                  >
                    <Send size={13} />
                    Send for Review
                  </button>
                )}
              </>
            )}

            {canReview && (
              <>
                <button
                  onClick={handleRequestRevision}
                  className="apple-button-secondary text-xs py-1.5 px-3 text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                >
                  <RotateCcw size={13} />
                  Send Back for Adjustment
                </button>
                <button
                  onClick={handleApprove}
                  className="apple-button text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 size={13} />
                  Approve & Stamp
                </button>
              </>
            )}

            {activeLetter?.status === 'APPROVED' && (
              <a
                href={`${getApiUrl()}/storage/${activeLetter.filePath}`}
                target="_blank"
                rel="noreferrer"
                className="apple-button text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
              >
                <ExternalLink size={13} />
                View Official PDF
              </a>
            )}
          </div>
        </div>

        {/* Letter Revision / Remarks Banner */}
        {activeLetter?.status === 'NEEDS_REVISION' && (
          <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold">Adjustment Requested by Reviewer</h5>
              <p className="mt-0.5">{activeLetter.remarks || 'Please revise document details and re-submit.'}</p>
            </div>
          </div>
        )}

        {/* Letter Details Content Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto w-full">
          {previewTab === 'preview' ? (
            /* --- DOCUMENT LIVE PREVIEW PANE --- */
            <div className="apple-card p-8 border border-border/80 shadow-xl bg-white text-zinc-900 min-h-[600px] space-y-6 font-serif">
              {/* Header Letterhead */}
              <div className="border-b-2 border-primary pb-4 text-center space-y-1">
                <div className="w-12 h-12 mx-auto mb-2">
                  <img src="/logo.png" alt="FCET Logo" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-primary uppercase">
                  Federal College of Education (Technical) Bichi
                </h1>
                <p className="text-xs font-semibold text-zinc-600 tracking-wider">
                  ICT DEPARTMENT -- OFFICIAL CORRESPONDENCE
                </p>
              </div>

              {/* Reference & Metadata */}
              <div className="grid grid-cols-2 text-xs border-b border-zinc-200 pb-4 font-sans">
                <div>
                  <p><span className="font-bold">Reference:</span> {activeLetter?.referenceNumber || 'DRAFT-CORRESPONDENCE'}</p>
                  <p><span className="font-bold">Date:</span> {activeLetter ? new Date(activeLetter.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">Author:</span> {activeLetter?.createdBy?.fullName || user.fullName}</p>
                  <p><span className="font-bold">Recipient:</span> {activeLetter?.recipient?.fullName || 'Assigned Supervisor'}</p>
                </div>
              </div>

              {/* Title / Subject */}
              <div className="space-y-1 font-sans">
                <span className="text-[10px] font-bold uppercase text-primary tracking-wider">Subject Title</span>
                <h2 className="text-lg font-bold text-zinc-900 border-b pb-2">{title || 'Untitled Correspondence'}</h2>
              </div>

              {/* Text Body */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap min-h-[250px] font-sans text-zinc-800">
                {content || 'No text content provided.'}
              </div>

              {/* File Attachment Card */}
              {(activeLetter?.attachmentPath || selectedFile) && (
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between font-sans text-xs">
                  <div className="flex items-center gap-2">
                    <Paperclip size={16} className="text-primary" />
                    <div>
                      <h4 className="font-bold text-zinc-800">
                        {selectedFile ? selectedFile.name : activeLetter?.attachmentPath?.split('/').pop()}
                      </h4>
                      <p className="text-[10px] text-zinc-500">Document attachment associated with correspondence</p>
                    </div>
                  </div>
                  {activeLetter?.attachmentPath && (
                    <a
                      href={`${getApiUrl()}/storage/${activeLetter.attachmentPath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1"
                    >
                      <Eye size={12} />
                      Open Attachment
                    </a>
                  )}
                </div>
              )}

              {/* Footer Remarks */}
              {activeLetter?.remarks && (
                <div className="p-4 bg-blue-50 border-l-4 border-blue-600 text-xs font-sans text-blue-900 rounded-r-xl">
                  <span className="font-bold">Reviewer Remarks:</span> {activeLetter.remarks}
                </div>
              )}
            </div>
          ) : (
            /* --- EDITOR FORM PANE --- */
            <div className="space-y-6">
              {/* Header Status & Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  {activeLetter && getStatusBadge(activeLetter.status)}
                  {activeLetter?.referenceNumber && (
                    <span className="font-mono text-xs px-2.5 py-0.5 bg-secondary text-foreground rounded-full border border-border/40 font-bold">
                      Ref: {activeLetter.referenceNumber}
                    </span>
                  )}
                </div>

                {/* Recipient Selection Dropdown */}
                <div className="flex items-center gap-2">
                  <UserCheck size={14} className="text-muted-foreground" />
                  <label className="text-xs font-medium text-muted-foreground">Recipient / Supervisor:</label>
                  <select
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value ? parseInt(e.target.value, 10) : '')}
                    disabled={!canEdit}
                    className="apple-input text-xs py-1 px-2 rounded-lg"
                  >
                    <option value="">Select Recipient...</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} (@{st.username}) - {st.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Subject Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Subject of Correspondence..."
                  className="w-full bg-transparent font-bold text-2xl border-b border-border/40 focus:border-primary outline-none pb-1.5 transition-all disabled:opacity-60"
                />
              </div>

              {/* Content Textarea */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Correspondence Text</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Write official correspondence details..."
                  className="w-full h-72 bg-transparent border border-border/40 focus:border-primary rounded-2xl p-4 text-xs leading-relaxed outline-none resize-none transition-all disabled:opacity-60 font-sans"
                />
              </div>

              {/* Word / PDF Document Attachment Picker */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Document Attachment (Word / PDF)</label>
                <div className="p-4 border border-dashed border-border/60 rounded-2xl bg-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Paperclip size={18} className="text-primary" />
                    <div>
                      <p className="text-xs font-semibold">
                        {selectedFile ? selectedFile.name : activeLetter?.attachmentPath ? activeLetter.attachmentPath.split('/').pop() : 'Attach Word or PDF Document'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Supported formats: .docx, .doc, .pdf, .jpg, .png</p>
                    </div>
                  </div>

                  {canEdit && (
                    <label className="apple-button-secondary text-xs py-1.5 px-3 cursor-pointer">
                      Browse File
                      <input
                        type="file"
                        accept=".doc,.docx,.pdf,.png,.jpg,.jpeg"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Reviewer Remarks Textarea (Visible during Review) */}
              {canReview && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileCheck size={14} className="text-primary" />
                    Reviewer Remarks & Adjustment Instructions
                  </label>
                  <textarea
                    value={reviewerRemarks}
                    onChange={(e) => setReviewerRemarks(e.target.value)}
                    placeholder="Enter remarks or instructions before approving or sending back for adjustment..."
                    className="w-full h-20 bg-background border border-border/40 focus:border-primary rounded-xl p-3 text-xs outline-none resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
