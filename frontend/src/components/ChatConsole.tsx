import React, { useState, useEffect, useRef } from 'react';
import {
  Hash,
  MessageSquare,
  Send,
  Paperclip,
  Plus,
  Users,
  Search,
  User,
  Phone,
  Video,
  FileText,
  X,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { apiRequest, apiDownloadBlob, apiUploadWithProgress, getApiUrl } from '../lib/api';
import { getSocket } from '../lib/socket';

interface ChatConsoleProps {
  user: any;
  onStartCall?: (channelId: number, type: 'audio' | 'video', isGroup?: boolean) => void;
}

export default function ChatConsole({ user, onStartCall }: ChatConsoleProps) {
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

  // Mobile view toggle state
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Real-time Online Users State
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);

  // File Upload Progress State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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
    setShowMobileChat(true);
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
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
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

    socket.emit('getOnlineUsers');

    const handleOnlineUsersList = (ids: number[]) => {
      setOnlineUserIds(ids);
    };

    const handleUserStatus = (data: { userId: number; status: string }) => {
      if (data.status === 'online') {
        setOnlineUserIds((prev) => Array.from(new Set([...prev, data.userId])));
      } else {
        setOnlineUserIds((prev) => prev.filter((id) => id !== data.userId));
      }
    };

    socket.on('onlineUsersList', handleOnlineUsersList);
    socket.on('userStatus', handleUserStatus);
    socket.on('message', handleNewMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('onlineUsersList', handleOnlineUsersList);
      socket.off('userStatus', handleUserStatus);
      socket.off('message', handleNewMessage);
      socket.off('typing', handleTyping);
    };
  }, [activeChannel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initiate WebRTC Call via Global Parent Handler
  const initiateCall = (type: 'audio' | 'video') => {
    if (!activeChannel) return;
    const partner = activeChannel.members?.find((m: any) => (m.id || m.user?.id) !== user.id);
    const recipientId = partner ? (partner.id || partner.user?.id) : undefined;
    if (onStartCall) {
      onStartCall(activeChannel.id, type, activeChannel.isGroup, recipientId);
    }
  };

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
    if (newChannelIsGroup && !newChannelName.trim()) {
      alert('Please enter a room name');
      return;
    }
    if (selectedMembers.length === 0) {
      alert('Please select at least one recipient');
      return;
    }

    try {
      const targetUser = users.find((u) => u.id === selectedMembers[0]);
      const defaultName = newChannelIsGroup
        ? newChannelName
        : targetUser
        ? targetUser.fullName
        : 'Direct Message';

      const newChan = await apiRequest('/chat/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: defaultName,
          isGroup: newChannelIsGroup,
          memberIds: selectedMembers,
        }),
      });

      setShowCreateChannel(false);
      setNewChannelName('');
      setSelectedMembers([]);

      const updatedChannels = await apiRequest('/chat/channels');
      setChannels(updatedChannels);

      const found = updatedChannels.find((c: any) => c.id === newChan.id) || newChan;
      handleSelectChannel(found);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeChannel) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append('file', file);
    setUploadProgress(0);

    try {
      const attachment = await apiUploadWithProgress(
        `/chat/channel/${activeChannel.id}/attachment`,
        formData,
        (progress) => setUploadProgress(progress)
      );

      socket.emit('sendMessage', {
        channelId: activeChannel.id,
        content: `Shared an attachment: ${attachment.name}`,
        attachments: [attachment],
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleDownloadAttachment = async (pathStr: string, fileName: string) => {
    try {
      const cleanPath = pathStr.replace(/\\/g, '/');
      const fileUrl = `${getApiUrl()}/storage/${cleanPath}`;
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('File download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
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
    <div className="h-[calc(100vh-6.5rem)] flex apple-card overflow-hidden select-none relative">
      {/* Left Sidebar Pane (Discussions List) - Mobile Toggleable */}
      <div className={`w-full md:w-80 border-r border-border/60 flex flex-col bg-secondary/30 shrink-0 ${
        showMobileChat ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight">Messages</h2>
            <button
              onClick={() => setShowCreateChannel(true)}
              className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
              title="New Discussion / Meeting"
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
            const partner = chan.members?.find((m: any) => (m.id || m.user?.id) !== user.id);
            const isPartnerOnline = partner && onlineUserIds.includes(partner.id || partner.user?.id);

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
                <div className="relative shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                    isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    {chan.isGroup ? <Hash size={14} /> : <User size={14} />}
                  </div>
                  {!chan.isGroup && (
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
                      isPartnerOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                    }`} title={isPartnerOnline ? 'Online' : 'Offline'}></span>
                  )}
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

      {/* Main Conversation Window - Mobile Toggleable */}
      <div className={`flex-1 flex flex-col bg-background relative ${
        !showMobileChat ? 'hidden md:flex' : 'flex'
      }`}>
        {activeChannel ? (
          <>
            {/* Conversation Header */}
            <div className="px-4 sm:px-5 py-3 border-b border-border/40 flex items-center justify-between bg-background/80 backdrop-blur-md">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-semibold"
                  title="Back to chats"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>

                {(() => {
                  const partner = activeChannel.members?.find((m: any) => (m.id || m.user?.id) !== user.id);
                  const isPartnerOnline = partner && onlineUserIds.includes(partner.id || partner.user?.id);

                  return (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {activeChannel.isGroup ? <Hash size={14} /> : <User size={14} />}
                        </div>
                        {!activeChannel.isGroup && (
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
                            isPartnerOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                          }`}></span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold">{getChannelDisplayName(activeChannel)}</h3>
                        <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          {activeChannel.isGroup ? (
                            `${activeChannel.members?.length || 0} Members (Group Room)`
                          ) : (
                            <>
                              <span className={`w-1.5 h-1.5 rounded-full ${isPartnerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`}></span>
                              {isPartnerOnline ? 'Online' : 'Offline'}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* WebRTC Audio & Video Calling Action Buttons */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => initiateCall('audio')}
                  className="p-2 rounded-full hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer"
                  title="Start Audio Call"
                >
                  <Phone size={16} />
                </button>
                <button
                  onClick={() => initiateCall('video')}
                  className="p-2 rounded-full hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
                  title="Start Group Video Meeting"
                >
                  <Video size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === user.id;
                const isCallLog = msg.content?.includes('📞') || msg.content?.includes('📵');

                if (isCallLog) {
                  return (
                    <div key={msg.id} className="my-2 flex items-center justify-center">
                      <div className="px-3 py-1 rounded-full bg-secondary/80 border border-border/60 text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5 shadow-2xs">
                        {msg.content.includes('Video') ? <Video size={12} className="text-indigo-500" /> : <Phone size={12} className="text-emerald-500" />}
                        <span>{msg.content}</span>
                        <span className="opacity-60 text-[9px]">
                          ({new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      </div>
                    </div>
                  );
                }

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

                      {/* Attachments rendering with Instant Image Preview */}
                      {msg.attachments?.map((att: any) => {
                        const cleanPath = att.path ? att.path.replace(/\\/g, '/') : '';
                        const fileUrl = `${getApiUrl()}/storage/${cleanPath}`;
                        const isImage =
                          (att.mimeType && att.mimeType.startsWith('image/')) ||
                          /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.name);

                        return (
                          <div key={att.id || att.path} className="mt-2 space-y-1">
                            {isImage && (
                              <div className="relative group max-w-xs overflow-hidden rounded-xl border border-border/40 bg-background/50">
                                <img
                                  src={fileUrl}
                                  alt={att.name}
                                  className="w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-all"
                                  onClick={() => window.open(fileUrl, '_blank')}
                                />
                              </div>
                            )}

                            <div
                              onClick={() => handleDownloadAttachment(att.path, att.name)}
                              className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer border hover:underline transition-all ${
                                isMe ? 'bg-white/10 border-white/20 text-white' : 'bg-background border-border text-foreground'
                              }`}
                            >
                              <Paperclip size={12} />
                              <span className="truncate flex-1 font-medium">{att.name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <span className="text-[9px] text-muted-foreground/60 mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef}></div>
            </div>

            {/* Upload Progress Bar */}
            {uploadProgress !== null && (
              <div className="px-5 py-2 border-t border-border/40 bg-primary/5 flex items-center gap-3">
                <span className="text-xs font-semibold text-primary truncate flex-1">Uploading attachment...</span>
                <span className="text-xs font-mono font-bold text-primary">{uploadProgress}%</span>
                <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

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
                className="p-2 text-muted-foreground hover:text-primary rounded-full hover:bg-secondary transition-all cursor-pointer"
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
                placeholder="Type your message..."
                className="apple-input flex-1 text-xs py-2"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="apple-button px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send size={14} />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <MessageSquare size={48} className="stroke-[1.2] opacity-40 mb-2" />
            <p className="text-xs font-semibold">Select a discussion or meeting room to start</p>
          </div>
        )}
      </div>

      {/* --- CREATE CHANNEL / GROUP MEETING MODAL --- */}
      {showCreateChannel && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="apple-card max-w-sm w-full p-6 space-y-4 shadow-2xl border border-border">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-bold">New Discussion / Direct Message</h3>
              <button onClick={() => setShowCreateChannel(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-4 py-1">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="isGroup"
                    checked={!newChannelIsGroup}
                    onChange={() => setNewChannelIsGroup(false)}
                  />
                  Direct Message (1-on-1)
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="isGroup"
                    checked={newChannelIsGroup}
                    onChange={() => setNewChannelIsGroup(true)}
                  />
                  Group Room
                </label>
              </div>

              {newChannelIsGroup && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Group Title / Room Name</label>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. ICT Weekly Huddle"
                    className="apple-input w-full"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {newChannelIsGroup ? 'Select Group Participants' : 'Select Recipient'}
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-border/40 rounded-xl p-2 bg-secondary/30">
                  {users.map((u) => {
                    const isSelected = selectedMembers.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (newChannelIsGroup) {
                            if (isSelected) {
                              setSelectedMembers(selectedMembers.filter((id) => id !== u.id));
                            } else {
                              setSelectedMembers([...selectedMembers, u.id]);
                            }
                          } else {
                            setSelectedMembers([u.id]);
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
                onClick={handleCreateChannelSubmit}
                disabled={selectedMembers.length === 0}
                className="apple-button w-full py-2.5 text-xs font-semibold mt-2 disabled:opacity-50"
              >
                Start Conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
