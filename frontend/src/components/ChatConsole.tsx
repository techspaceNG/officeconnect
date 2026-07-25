import React, { useState, useEffect, useRef } from 'react';
import { Hash, MessageSquare, Send, Paperclip, Plus, Users, Search, User } from 'lucide-react';
import { apiRequest, getApiUrl } from '../lib/api';
import { getSocket } from '../lib/socket';

interface ChatConsoleProps {
  user: any;
}

export default function ChatConsole({ user }: ChatConsoleProps) {
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelIsGroup, setNewChannelIsGroup] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [filterQuery, setFilterQuery] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const socket = getSocket();

  const fetchChannels = async () => {
    try {
      const data = await apiRequest('/chat/channels');
      setChannels(data);
      if (data.length > 0 && !activeChannel) {
        handleSelectChannel(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const dataUsers = await apiRequest('/users');
      setUsers(dataUsers.filter((u: any) => u.id !== user.id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectChannel = async (channel: any) => {
    if (activeChannel) {
      socket.emit('leaveChannel', { channelId: activeChannel.id });
    }
    setActiveChannel(channel);
    socket.emit('joinChannel', { channelId: channel.id });

    try {
      const data = await apiRequest(`/chat/channel/${channel.id}/messages`);
      setMessages(data);
      
      if (data.length > 0) {
        const lastMsg = data[data.length - 1];
        socket.emit('markAsRead', { messageId: lastMsg.id, channelId: channel.id });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchUsers();

    const handleNewMessage = (msg: any) => {
      if (activeChannel && msg.channelId === activeChannel.id) {
        setMessages((prev) => [...prev, msg]);
        socket.emit('markAsRead', { messageId: msg.id, channelId: activeChannel.id });
      }
      fetchChannels();
    };

    const handleTyping = (data: { channelId: number; userId: number; username: string; isTyping: boolean }) => {
      if (activeChannel && data.channelId === activeChannel.id) {
        if (data.isTyping) {
          setTypingUsers((prev) => Array.from(new Set([...prev, data.username])));
        } else {
          setTypingUsers((prev) => prev.filter((name) => name !== data.username));
        }
      }
    };

    socket.on('message', handleNewMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('message', handleNewMessage);
      socket.off('typing', handleTyping);
    };
  }, [activeChannel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeChannel) return;

    socket.emit('sendMessage', {
      channelId: activeChannel.id,
      content: messageText,
    });

    setMessageText('');
    socket.emit('typing', { channelId: activeChannel.id, isTyping: false });
  };

  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    if (!activeChannel) return;

    socket.emit('typing', { channelId: activeChannel.id, isTyping: true });
    
    setTimeout(() => {
      socket.emit('typing', { channelId: activeChannel.id, isTyping: false });
    }, 3000);
  };

  const handleCreateChannelSubmit = async () => {
    if (!newChannelName.trim()) return;
    if (!newChannelIsGroup && selectedMembers.length === 0) {
      alert('Please select a recipient');
      return;
    }

    try {
      const newChan = await apiRequest('/chat/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChannelName,
          isGroup: newChannelIsGroup,
          memberIds: selectedMembers,
        }),
      });
      setShowCreateChannel(false);
      setNewChannelName('');
      setSelectedMembers([]);
      setChannels((prev) => [...prev, newChan]);
      handleSelectChannel(newChan);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeChannel) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append('file', file);

    try {
      const attachment = await apiRequest(`/chat/channel/${activeChannel.id}/attachment`, {
        method: 'POST',
        body: formData,
      });

      socket.emit('sendMessage', {
        channelId: activeChannel.id,
        content: `Shared an attachment: ${attachment.name}`,
        attachments: [attachment],
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDownloadAttachment = async (pathStr: string, fileName: string) => {
    try {
      const fileIdMatch = pathStr.match(/\/(\d+)_/);
      if (!fileIdMatch) {
        alert('File path structure error');
        return;
      }
      const fileId = fileIdMatch[1];
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

  const getChannelDisplayName = (c: any) => {
    if (c.isGroup) return c.name;
    const partner = c.members?.find((m: any) => (m.id || m.user?.id) !== user.id);
    return partner ? (partner.fullName || partner.user?.fullName || c.name) : c.name;
  };

  const filteredChannels = channels.filter((c) =>
    getChannelDisplayName(c).toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col md:flex-row apple-card overflow-hidden select-none">
      {/* Left Sidebar Pane */}
      <div className="w-full md:w-80 h-48 md:h-auto border-r border-border/60 flex flex-col bg-secondary/30 shrink-0">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight">Messages</h2>
            <button
              onClick={() => setShowCreateChannel(true)}
              className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
              title="New Discussion"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-muted-foreground" size={13} />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search chats..."
              className="apple-input w-full pl-8 py-1 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* Discussions List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {filteredChannels.map((chan) => {
            const isActive = activeChannel?.id === chan.id;
            const displayName = getChannelDisplayName(chan);
            const lastMsg = chan.messages?.[0];

            return (
              <div
                key={chan.id}
                onClick={() => handleSelectChannel(chan)}
                className={`p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm font-semibold'
                    : 'hover:bg-secondary/80 text-foreground'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                }`}>
                  {chan.isGroup ? <Hash size={14} /> : <User size={14} />}
                </div>

                <div className="truncate flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs truncate font-medium">{displayName}</h3>
                    {lastMsg && (
                      <span className={`text-[9px] ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {lastMsg ? lastMsg.content : 'No messages yet'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className="flex-1 flex flex-col bg-background">
        {activeChannel ? (
          <>
            {/* Conversation Header */}
            <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between bg-background/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {activeChannel.isGroup ? <Hash size={14} /> : <User size={14} />}
                </div>
                <div>
                  <h3 className="text-xs font-bold">{getChannelDisplayName(activeChannel)}</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {activeChannel.isGroup
                      ? `${activeChannel.members?.length || 0} Members`
                      : 'Direct Message'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === user.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {!isMe && (
                      <span className="text-[10px] font-medium text-muted-foreground mb-1 px-1">
                        {msg.sender?.fullName}
                      </span>
                    )}

                    <div className={isMe ? 'imessage-bubble-sent' : 'imessage-bubble-received'}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      {/* Attachments rendering */}
                      {msg.attachments?.map((att: any) => (
                        <div
                          key={att.id}
                          onClick={() => handleDownloadAttachment(att.path, att.name)}
                          className={`mt-2 flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer border hover:underline transition-all ${
                            isMe ? 'bg-white/10 border-white/20 text-white' : 'bg-background border-border text-foreground'
                          }`}
                        >
                          <Paperclip size={12} />
                          <span className="truncate flex-1 font-medium">{att.name}</span>
                        </div>
                      ))}
                    </div>

                    <span className="text-[9px] text-muted-foreground/60 mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef}></div>
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-5 py-1 text-[10px] text-muted-foreground italic">
                {typingUsers.join(', ')} typing...
              </div>
            )}

            {/* Input Bar (Apple Pill Style) */}
            <div className="p-3.5 border-t border-border/40 bg-secondary/20 flex items-center gap-2">
              <button
                onClick={() => attachmentInputRef.current?.click()}
                className="p-2 text-muted-foreground hover:text-primary rounded-full hover:bg-secondary transition-all"
                title="Attach File"
              >
                <Paperclip size={16} />
              </button>
              <input
                type="file"
                ref={attachmentInputRef}
                onChange={handleAttachmentUpload}
                className="hidden"
              />
              <input
                type="text"
                value={messageText}
                onChange={handleTypingInput}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="iMessage"
                className="apple-input flex-1 rounded-full px-4 py-2 text-xs"
              />
              <button
                onClick={handleSendMessage}
                className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
              >
                <Send size={14} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground select-none">
            <MessageSquare size={48} className="stroke-[1.2] mb-3 text-muted-foreground/50" />
            <p className="text-xs font-semibold">Select a conversation to begin</p>
          </div>
        )}
      </div>

      {/* Create Discussion Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
          <div className="apple-card w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold">Create Discussion</h3>
            
            <div className="space-y-3">
              <div className="apple-segmented-control">
                <button
                  type="button"
                  onClick={() => {
                    setNewChannelIsGroup(true);
                    setSelectedMembers([]);
                  }}
                  className={`apple-segmented-item flex-1 ${newChannelIsGroup ? 'apple-segmented-item-active' : ''}`}
                >
                  Group Channel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewChannelIsGroup(false);
                    setNewChannelName('Direct Message');
                    setSelectedMembers([]);
                  }}
                  className={`apple-segmented-item flex-1 ${!newChannelIsGroup ? 'apple-segmented-item-active' : ''}`}
                >
                  Direct Message
                </button>
              </div>

              {newChannelIsGroup && (
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Group Name</label>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. Project Apollo"
                    className="apple-input w-full"
                  />
                </div>
              )}

              {newChannelIsGroup ? (
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1.5">Select Members</label>
                  <div className="max-h-[140px] overflow-y-auto border border-border/60 rounded-xl p-2 space-y-1 bg-secondary/30">
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2.5 text-xs py-1.5 px-2 hover:bg-secondary rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers((prev) => [...prev, u.id]);
                            } else {
                              setSelectedMembers((prev) => prev.filter((id) => id !== u.id));
                            }
                          }}
                          className="accent-primary rounded"
                        />
                        <span>{u.fullName} ({u.username})</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1.5">Select Recipient</label>
                  <div className="max-h-[140px] overflow-y-auto border border-border/60 rounded-xl p-2 space-y-1 bg-secondary/30">
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2.5 text-xs py-1.5 px-2 hover:bg-secondary rounded-lg cursor-pointer">
                        <input
                          type="radio"
                          name="dmRecipient"
                          checked={selectedMembers.includes(u.id)}
                          onChange={() => {
                            setSelectedMembers([u.id]);
                          }}
                          className="accent-primary"
                        />
                        <span>{u.fullName} ({u.username})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <button
                onClick={() => setShowCreateChannel(false)}
                className="apple-button-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannelSubmit}
                className="apple-button text-xs"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
