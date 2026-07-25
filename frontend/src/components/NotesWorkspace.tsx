import React, { useState, useEffect } from 'react';
import { FileText, Plus, Pin, Trash2, Save, FileEdit, Search } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface NotesWorkspaceProps {
  user: any;
  onRefreshStats: () => void;
}

export default function NotesWorkspace({ user, onRefreshStats }: NotesWorkspaceProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/notes');
      setNotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSelectNote = (note: any) => {
    setActiveNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || '');
  };

  const handleNewNote = () => {
    setActiveNote(null);
    setTitle('Untitled Note');
    setContent('');
    setCategory('General');
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);

    try {
      if (activeNote) {
        const updated = await apiRequest(`/notes/${activeNote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, category }),
        });
        setNotes((prev) =>
          prev.map((n) => (n.id === activeNote.id ? updated : n))
        );
        setActiveNote(updated);
      } else {
        const created = await apiRequest('/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, category }),
        });
        setNotes((prev) => [created, ...prev]);
        setActiveNote(created);
        onRefreshStats();
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    setLoading(true);

    try {
      await apiRequest(`/notes/${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (activeNote?.id === id) {
        handleNewNote();
      }
      onRefreshStats();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const updated = await apiRequest(`/notes/${id}/pin`, { method: 'POST' });
      setNotes((prev) =>
        prev
          .map((n) => (n.id === id ? updated : n))
          .sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          })
      );
      if (activeNote?.id === id) {
        setActiveNote(updated);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.category && n.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col md:flex-row apple-card overflow-hidden select-none">
      {/* macOS Notes Left Sidebar */}
      <div className="w-full md:w-80 h-48 md:h-auto border-r border-border/60 flex flex-col bg-secondary/30 shrink-0">
        <div className="p-3.5 border-b border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight">Apple Notes</h2>
            <button
              onClick={handleNewNote}
              className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
              title="Create Note"
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
              placeholder="Search notes..."
              className="apple-input w-full pl-8 py-1 text-xs rounded-lg"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {filteredNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">No notes found.</p>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`p-3 rounded-xl cursor-pointer transition-all flex flex-col gap-1 relative group border ${
                  activeNote?.id === note.id
                    ? 'border-primary/50 bg-primary/10 shadow-sm'
                    : 'border-transparent hover:bg-secondary/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 pr-5">
                  <h4 className="font-bold text-xs truncate">{note.title}</h4>
                  <button
                    onClick={(e) => handleTogglePin(e, note.id)}
                    className={`shrink-0 ${
                      note.isPinned
                        ? 'text-amber-500'
                        : 'text-muted-foreground hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-all'
                    }`}
                  >
                    <Pin size={12} className={note.isPinned ? 'fill-amber-500' : ''} />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 font-medium">
                  {note.content || 'Empty note content...'}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="bg-secondary px-2 py-0.5 rounded-full font-semibold border border-border/40">
                    {note.category || 'General'}
                  </span>
                  <span className="font-mono">{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Main Pane */}
      <div className="flex-1 flex flex-col bg-background relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 backdrop-blur-xs">
            <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>
          </div>
        )}

        {/* Editor Toolbar */}
        <div className="px-6 py-3 border-b border-border/40 flex items-center justify-between bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <FileEdit size={16} className="text-primary" />
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              {activeNote ? 'Edit Workspace Note' : 'New Note'}
            </span>
          </div>
          <div className="flex gap-2">
            {activeNote && (
              <button
                onClick={() => handleDelete(activeNote.id)}
                className="apple-button-secondary text-xs py-1.5 px-3 text-destructive border-destructive/20"
              >
                <Trash2 size={13} />
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              className="apple-button text-xs py-1.5 px-3"
            >
              <Save size={13} />
              Save Note
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 flex flex-col p-8 space-y-4 overflow-y-auto max-w-3xl mx-auto w-full">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note Title..."
                className="w-full bg-transparent font-bold text-2xl border-b border-border/40 focus:border-primary outline-none pb-1.5 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Category Tag</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Project, Task"
                className="apple-input w-full text-xs"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col pt-2 min-h-[350px]">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type note content..."
              className="flex-1 w-full bg-transparent border border-border/40 focus:border-primary rounded-2xl p-4 text-xs leading-relaxed outline-none resize-none transition-all font-sans"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
