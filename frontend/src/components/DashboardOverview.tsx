import React from 'react';
import { FileText, FolderPlus, Send, Activity, ShieldAlert, HardDrive } from 'lucide-react';

interface OverviewProps {
  user: any;
  stats: {
    filesCount: number;
    notesCount: number;
    lettersCount: number;
    storageUsed: number;
    storageTotal: number;
  };
  announcements: any[];
  pendingLetters: any[];
  recentFiles: any[];
  onNavigate: (tab: string) => void;
  onApproveLetter: (id: number) => void;
  onRejectLetter: (id: number, reason: string) => void;
}

export default function DashboardOverview({
  user,
  stats,
  announcements,
  pendingLetters,
  recentFiles,
  onNavigate,
  onApproveLetter,
  onRejectLetter,
}: OverviewProps) {
  const storagePercentage = Math.min(100, Math.round((stats.storageUsed / stats.storageTotal) * 100)) || 0;
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRejectPrompt = (id: number) => {
    const reason = prompt('Please enter a rejection reason:');
    if (reason) {
      onRejectLetter(id, reason);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Welcome Ambient Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-indigo-600 to-blue-600 p-8 text-white shadow-lg">
        <div className="relative z-10 space-y-1">
          <span className="text-[10px] font-bold tracking-widest uppercase text-blue-200">Department Overview</span>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Welcome, {user.fullName}</h1>
          <p className="text-xs text-blue-100/80 font-medium pt-1 max-w-lg">
            OfficeConnect Internal LAN Server is active on HPE DL360 Gen10 node.
          </p>
        </div>
        <div className="absolute right-2 -bottom-6 top-0 opacity-10 flex items-center pr-6 pointer-events-none">
          <Activity size={200} />
        </div>
      </div>

      {/* Announcements Board */}
      {announcements.length > 0 && (
        <div className="apple-card p-5 space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Department Announcements
          </h2>
          <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
            {announcements.map((ann, i) => (
              <div key={ann.id || i} className="p-3 bg-secondary/50 rounded-xl border border-border/40 space-y-1">
                <h3 className="font-semibold text-xs text-foreground">{ann.title}</h3>
                <p className="text-xs text-muted-foreground">{ann.content}</p>
                <div className="text-[10px] text-muted-foreground/70 text-right pt-1">
                  {new Date(ann.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Stats grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Storage Stats */}
        <div className="apple-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">LAN Storage</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <HardDrive size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-2xl font-bold tracking-tight">{formatBytes(stats.storageUsed)}</div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden p-0.5 border border-border/30">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${storagePercentage}%` }}></div>
            </div>
            <div className="text-[10px] text-muted-foreground flex justify-between font-medium">
              <span>{storagePercentage}% Used</span>
              <span>Quota: {formatBytes(stats.storageTotal)}</span>
            </div>
          </div>
        </div>

        {/* Notes Stat */}
        <div onClick={() => onNavigate('notes')} className="apple-card p-5 cursor-pointer flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">{stats.notesCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">Saved workspace notes</p>
          </div>
        </div>

        {/* Letters Stat */}
        <div onClick={() => onNavigate('letters')} className="apple-card p-5 cursor-pointer flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Correspondence</span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Send size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">{stats.lettersCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">Official letter drafts</p>
          </div>
        </div>

        {/* Files Stat */}
        <div onClick={() => onNavigate('files')} className="apple-card p-5 cursor-pointer flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">File Center</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <FolderPlus size={16} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">{stats.filesCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">Department exchange assets</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Pending Approvals */}
        <div className="apple-card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-500" />
            Letters Pending Approval
          </h2>
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {pendingLetters.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No pending letters requiring approval.</p>
            ) : (
              pendingLetters.map((letter) => (
                <div key={letter.id} className="p-3 bg-secondary/50 rounded-xl border border-border/40 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-xs">{letter.title}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">By: {letter.createdBy?.fullName}</p>
                  </div>
                  {(user.role === 'SUPER_ADMIN' || user.role === 'DIRECTOR') ? (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => onApproveLetter(letter.id)}
                        className="apple-button text-xs py-1 px-3"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectPrompt(letter.id)}
                        className="apple-button-secondary text-xs py-1 px-3 text-destructive border-destructive/20"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
                      Pending Review
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent File Transfers */}
        <div className="apple-card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <HardDrive size={16} className="text-emerald-500" />
            Recent File Transfers
          </h2>
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {recentFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No files uploaded recently.</p>
            ) : (
              recentFiles.map((file) => (
                <div key={file.id} className="p-3 bg-secondary/50 rounded-xl border border-border/40 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <h3 className="font-semibold text-xs truncate">{file.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      By: {file.createdBy?.fullName} • {formatBytes(file.size)}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
