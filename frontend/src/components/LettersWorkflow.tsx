import React, { useState, useEffect } from 'react';
import { Send, Plus, Search, FileText, CheckCircle2, XCircle, Clock, Save, ExternalLink } from 'lucide-react';
import { apiRequest, getApiUrl } from '../lib/api';

interface LettersWorkflowProps {
  user: any;
  onRefreshStats: () => void;
}

export default function LettersWorkflow({ user, onRefreshStats }: LettersWorkflowProps) {
  const [letters, setLetters] = useState<any[]>([]);
  const [activeLetter, setActiveLetter] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchLetters();
  }, []);

  const handleSelectLetter = (lettr: any) => {
    setActiveLetter(lettr);
    setTitle(lettr.title);
    setContent(lettr.content);
  };

  const handleNewLetter = () => {
    setActiveLetter(null);
    setTitle('New Official Correspondence');
    setContent('');
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);

    try {
      if (activeLetter) {
        const updated = await apiRequest(`/letters/${activeLetter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
        });
        setLetters((prev) =>
          prev.map((l) => (l.id === activeLetter.id ? updated : l))
        );
        setActiveLetter(updated);
      } else {
        const created = await apiRequest('/letters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
        });
        setLetters((prev) => [created, ...prev]);
        setActiveLetter(created);
        onRefreshStats();
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeLetter) return;
    setLoading(true);

    try {
      const updated = await apiRequest(`/letters/${activeLetter.id}/submit`, {
        method: 'POST',
      });
      setLetters((prev) =>
        prev.map((l) => (l.id === activeLetter.id ? updated : l))
      );
      setActiveLetter(updated);
      onRefreshStats();
    } catch (e) {
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
      });
      setLetters((prev) =>
        prev.map((l) => (l.id === activeLetter.id ? updated : l))
      );
      setActiveLetter(updated);
      onRefreshStats();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!activeLetter) return;
    const reason = prompt('Please enter a rejection reason:');
    if (!reason) return;

    setLoading(true);
    try {
      const updated = await apiRequest(`/letters/${activeLetter.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      setLetters((prev) =>
        prev.map((l) => (l.id === activeLetter.id ? updated : l))
      );
      setActiveLetter(updated);
      onRefreshStats();
    } catch (e) {
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
            Pending Review
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

  return (
    <div className="h-[calc(100vh-6.5rem)] flex apple-card overflow-hidden select-none">
      {/* Sidebar List */}
      <div className="w-80 border-r border-border/60 flex flex-col bg-secondary/30">
        <div className="p-3.5 border-b border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight">Correspondence</h2>
            <button
              onClick={handleNewLetter}
              className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
              title="Draft Correspondence"
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
              placeholder="Search letters..."
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
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Author: {lettr.createdBy?.fullName || 'Me'}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
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
      <div className="flex-1 flex flex-col bg-background relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 backdrop-blur-xs">
            <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>
          </div>
        )}

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-border/40 flex items-center justify-between bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-primary" />
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Official Correspondence Workspace
            </span>
          </div>
          <div className="flex gap-2">
            {(!activeLetter || activeLetter.status === 'DRAFT' || activeLetter.status === 'REJECTED') && (
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
                    onClick={handleSubmit}
                    className="apple-button text-xs py-1.5 px-3"
                  >
                    <Send size={13} />
                    Submit Approval
                  </button>
                )}
              </>
            )}

            {activeLetter && activeLetter.status === 'PENDING_APPROVAL' && (user.role === 'SUPER_ADMIN' || user.role === 'DIRECTOR') && (
              <>
                <button
                  onClick={handleApprove}
                  className="apple-button text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 size={13} />
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  className="apple-button-secondary text-xs py-1.5 px-3 text-destructive border-destructive/20"
                >
                  <XCircle size={13} />
                  Reject
                </button>
              </>
            )}

            {activeLetter && activeLetter.status === 'APPROVED' && (
              <a
                href={`${getApiUrl()}/storage/${activeLetter.filePath}`}
                target="_blank"
                rel="noreferrer"
                className="apple-button text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
              >
                <ExternalLink size={13} />
                View PDF Letter
              </a>
            )}
          </div>
        </div>

        {/* Letter Details */}
        <div className="flex-1 flex flex-col p-8 space-y-4 overflow-y-auto max-w-3xl mx-auto w-full">
          {activeLetter && (
            <div className="flex flex-wrap items-center gap-3">
              {getStatusBadge(activeLetter.status)}
              {activeLetter.referenceNumber && (
                <span className="font-mono text-xs px-2.5 py-0.5 bg-secondary text-foreground rounded-full border border-border/40 font-bold">
                  Ref: {activeLetter.referenceNumber}
                </span>
              )}
            </div>
          )}

          {activeLetter?.status === 'REJECTED' && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs space-y-1">
              <h5 className="font-bold flex items-center gap-1.5">
                <XCircle size={14} />
                Rejection Reason
              </h5>
              <p>{activeLetter.rejectionReason || 'No reason provided.'}</p>
            </div>
          )}

          <div className="flex-1 flex flex-col space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Subject Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={activeLetter?.status === 'PENDING_APPROVAL' || activeLetter?.status === 'APPROVED'}
                placeholder="Letter Title..."
                className="w-full bg-transparent font-bold text-2xl border-b border-border/40 focus:border-primary outline-none pb-1.5 transition-all disabled:opacity-60"
              />
            </div>

            <div className="flex-1 flex flex-col pt-2 min-h-[350px]">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={activeLetter?.status === 'PENDING_APPROVAL' || activeLetter?.status === 'APPROVED'}
                placeholder="Write official text..."
                className="flex-1 w-full bg-transparent border border-border/40 focus:border-primary rounded-2xl p-4 text-xs leading-relaxed outline-none resize-none transition-all disabled:opacity-60 font-sans"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
