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
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Monitor,
  FileText,
  X,
  Check,
} from 'lucide-react';
import { apiRequest, apiDownloadBlob, getApiUrl } from '../lib/api';
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

  // Real-time Online Users State
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);

  // --- WebRTC & Audio/Video Call State ---
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [incomingCall, setIncomingCall] = useState<{
    channelId: number;
    caller: any;
    offer: any;
    callType: 'audio' | 'video';
    isGroup?: boolean;
  } | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [showMeetingNotes, setShowMeetingNotes] = useState(false);
  const [meetingNotesText, setMeetingNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // WebRTC Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

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

    // WebRTC Signaling Handlers
    const handleIncomingCall = (data: any) => {
      if (data.caller.id !== user.id) {
        setIncomingCall(data);
      }
    };

    const handleCallAccepted = async (data: any) => {
      if (peerConnectionRef.current && data.answer) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    };

    const handleIceCandidateReceived = async (data: any) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error(e);
        }
      }
    };

    const handleCallEnded = () => {
      cleanUpCall();
    };

    const handleCallRejected = () => {
      alert('Call declined by recipient.');
      cleanUpCall();
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
    socket.on('incomingCall', handleIncomingCall);
    socket.on('callAccepted', handleCallAccepted);
    socket.on('iceCandidate', handleIceCandidateReceived);
    socket.on('callEnded', handleCallEnded);
    socket.on('callRejected', handleCallRejected);

    return () => {
      socket.off('onlineUsersList', handleOnlineUsersList);
      socket.off('userStatus', handleUserStatus);
      socket.off('message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('incomingCall', handleIncomingCall);
      socket.off('callAccepted', handleCallAccepted);
      socket.off('iceCandidate', handleIceCandidateReceived);
      socket.off('callEnded', handleCallEnded);
      socket.off('callRejected', handleCallRejected);
    };
  }, [activeChannel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- WebRTC Logic ---

  const startCall = async (type: 'audio' | 'video') => {
    if (!activeChannel) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('iceCandidate', {
            channelId: activeChannel.id,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('callUser', {
        channelId: activeChannel.id,
        offer,
        callType: type,
        isGroup: activeChannel.isGroup,
      });

      setCallType(type);
      setIsInCall(true);
    } catch (err: any) {
      alert(`Could not start ${type} call: ` + err.message);
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      const type = incomingCall.callType;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('iceCandidate', {
            channelId: incomingCall.channelId,
            candidate: event.candidate,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answerCall', {
        channelId: incomingCall.channelId,
        answer,
      });

      setCallType(type);
      setIsInCall(true);
      setIncomingCall(null);
    } catch (err: any) {
      alert('Could not answer call: ' + err.message);
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      socket.emit('rejectCall', { channelId: incomingCall.channelId });
      setIncomingCall(null);
    }
  };

  const cleanUpCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setIsInCall(false);
    setIncomingCall(null);
    setIsMicMuted(false);
    setIsCamOff(false);
    setShowMeetingNotes(false);
  };

  const endCall = () => {
    if (activeChannel) {
      socket.emit('endCall', { channelId: activeChannel.id });
    }
    cleanUpCall();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  const saveMeetingNotes = async () => {
    if (!meetingNotesText.trim()) return;
    setIsSavingNotes(true);
    try {
      const channelTitle = activeChannel ? getChannelDisplayName(activeChannel) : 'Meeting';
      await apiRequest('/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Meeting Minutes: ${channelTitle} (${new Date().toLocaleDateString()})`,
          content: meetingNotesText,
          isPinned: true,
        }),
      });
      alert('Meeting Minutes saved directly to Notes Workspace!');
      setShowMeetingNotes(false);
      setMeetingNotesText('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingNotes(false);
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
    } catch (e: any) {
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
    } catch (err: any) {
      alert(err.message);
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
    <div className="h-[calc(100vh-6.5rem)] flex flex-col md:flex-row apple-card overflow-hidden select-none relative">
      {/* Left Sidebar Pane */}
      <div className="w-full md:w-80 h-48 md:h-auto border-r border-border/60 flex flex-col bg-secondary/30 shrink-0">
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

      {/* Main Conversation Window */}
      <div className="flex-1 flex flex-col bg-background relative">
        {activeChannel ? (
          <>
            {/* Conversation Header */}
            <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between bg-background/80 backdrop-blur-md">
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

              {/* WebRTC Audio & Video Calling Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => startCall('audio')}
                  className="p-2 rounded-full hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer"
                  title="Start Audio Call"
                >
                  <Phone size={16} />
                </button>
                <button
                  onClick={() => startCall('video')}
                  className="p-2 rounded-full hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
                  title="Start Group Video Meeting"
                >
                  <Video size={16} />
                </button>
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

                      {/* Attachments rendering with Image Preview */}
                      {msg.attachments?.map((att: any) => {
                        const cleanPath = att.path ? att.path.replace(/\\/g, '/') : '';
                        const fileUrl = `${getApiUrl()}/storage/${cleanPath}`;
                        const isImage =
                          (att.mimeType && att.mimeType.startsWith('image/')) ||
                          /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.name);

                        return (
                          <div key={att.id} className="mt-2 space-y-1">
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
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare size={48} className="stroke-[1.2] opacity-40 mb-2" />
            <p className="text-xs font-semibold">Select a discussion or meeting room to start</p>
          </div>
        )}
      </div>

      {/* --- INCOMING CALL RINGING MODAL --- */}
      {incomingCall && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="apple-card max-w-sm w-full p-6 text-center space-y-6 border border-primary/30 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mx-auto border-2 border-primary/40">
                {incomingCall.caller?.fullName?.charAt(0) || 'U'}
              </div>
              <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 rounded-full border-2 border-background animate-pulse"></span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">{incomingCall.caller?.fullName}</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Incoming {incomingCall.callType === 'video' ? 'Video Meeting' : 'Audio Call'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={rejectCall}
                className="w-12 h-12 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-all shadow-md cursor-pointer"
                title="Decline"
              >
                <PhoneOff size={20} />
              </button>

              <button
                onClick={acceptCall}
                className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shadow-md animate-bounce cursor-pointer"
                title="Accept Call"
              >
                {incomingCall.callType === 'video' ? <Video size={20} /> : <Phone size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ACTIVE AUDIO/VIDEO MEETING OVERLAY --- */}
      {isInCall && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-white/10 text-white">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold tracking-wide">
                {callType === 'video' ? 'Live Video Meeting' : 'Live Audio Call'}
              </span>
            </div>

            <button
              onClick={() => setShowMeetingNotes(!showMeetingNotes)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                showMeetingNotes
                  ? 'bg-white text-black border-white'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              <FileText size={14} />
              {showMeetingNotes ? 'Hide Minutes' : 'Take Meeting Minutes'}
            </button>
          </div>

          {/* Main Call Viewport & Meeting Notes Side Panel */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Video Streams Container */}
            <div className="flex-1 relative flex items-center justify-center p-4">
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl"
              />

              {/* Local Video Stream (Picture in Picture) */}
              {callType === 'video' && (
                <div className="absolute bottom-6 right-6 w-48 h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-zinc-800">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isCamOff && (
                    <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-white/50">
                      <VideoOff size={24} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Meeting Minutes Drawer Side Panel */}
            {showMeetingNotes && (
              <div className="w-80 border-l border-white/10 bg-zinc-900/90 backdrop-blur-xl p-4 flex flex-col space-y-3 z-10 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} />
                    Meeting Minutes
                  </h4>
                  <button onClick={() => setShowMeetingNotes(false)} className="text-white/60 hover:text-white">
                    <X size={14} />
                  </button>
                </div>

                <textarea
                  value={meetingNotesText}
                  onChange={(e) => setMeetingNotesText(e.target.value)}
                  placeholder="Record meeting notes, decisions, and action items here..."
                  className="flex-1 bg-zinc-800/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/40 resize-none focus:outline-none focus:border-primary"
                ></textarea>

                <button
                  onClick={saveMeetingNotes}
                  disabled={isSavingNotes || !meetingNotesText.trim()}
                  className="w-full py-2.5 bg-primary text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check size={14} />
                  {isSavingNotes ? 'Saving...' : 'Save to Notes Workspace'}
                </button>
              </div>
            )}
          </div>

          {/* Control Bar Footer */}
          <div className="p-4 border-t border-white/10 flex items-center justify-center gap-4 bg-zinc-950/80">
            <button
              onClick={toggleMic}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isMicMuted ? 'bg-destructive text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {callType === 'video' && (
              <button
                onClick={toggleCam}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isCamOff ? 'bg-destructive text-white' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isCamOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}

            <button
              onClick={endCall}
              className="w-14 h-14 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-all shadow-xl cursor-pointer"
              title="End Call"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}

      {/* --- CREATE CHANNEL / GROUP MEETING MODAL --- */}
      {showCreateChannel && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="apple-card max-w-sm w-full p-6 space-y-4 shadow-2xl border border-border">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-bold">New Discussion / Meeting Room</h3>
              <button onClick={() => setShowCreateChannel(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Title / Room Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. ICT Weekly Huddle"
                  className="apple-input w-full"
                />
              </div>

              <div className="flex items-center gap-4 py-1">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="isGroup"
                    checked={newChannelIsGroup}
                    onChange={() => setNewChannelIsGroup(true)}
                  />
                  Group Meeting Room
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="isGroup"
                    checked={!newChannelIsGroup}
                    onChange={() => setNewChannelIsGroup(false)}
                  />
                  Direct Message
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Select Participants</label>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-border/40 rounded-xl p-2 bg-secondary/30">
                  {users.map((u) => {
                    const isSelected = selectedMembers.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMembers(selectedMembers.filter((id) => id !== u.id));
                          } else {
                            setSelectedMembers([...selectedMembers, u.id]);
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
                disabled={!newChannelName.trim()}
                className="apple-button w-full py-2.5 text-xs font-semibold mt-2"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
