'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  HardDrive,
  MessageSquare,
  FileText,
  Send,
  ShieldAlert,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Activity,
  User,
  X,
  Sparkles,
  Sun,
  Moon,
  Menu,
  Bell,
  Phone,
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Check,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';

// Components
import DashboardOverview from '../components/DashboardOverview';
import FileCenter from '../components/FileCenter';
import ChatConsole from '../components/ChatConsole';
import NotesWorkspace from '../components/NotesWorkspace';
import LettersWorkflow from '../components/LettersWorkflow';
import AuditLogs from '../components/AuditLogs';
import Settings from '../components/Settings';

export default function Home() {
  const [user, setUser] = useState<any | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Dashboard & Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    filesCount: 0,
    notesCount: 0,
    lettersCount: 0,
    storageUsed: 0,
    storageTotal: 107374182400,
  });
  
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [pendingLetters, setPendingLetters] = useState<any[]>([]);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);

  // Real-time Toast & Notification Center State
  const [notifications, setNotifications] = useState<any[]>([
    {
      id: '1',
      title: 'Welcome to OfficeConnect',
      message: 'System ready for FCET Bichi ICT Department operations.',
      isRead: false,
      createdAt: 'Just now',
      type: 'system',
    },
  ]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markNotificationAsRead = (id: string, targetTab?: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (targetTab) setActiveTab(targetTab);
    setShowNotificationCenter(false);
  };

  const [toastNotification, setToastNotification] = useState<{
    title: string;
    message: string;
    type?: string;
    time: string;
  } | null>(null);

  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // --- Global WebRTC Call State Across All Pages ---
  const [globalCall, setGlobalCall] = useState<{
    isInCall: boolean;
    callType: 'audio' | 'video';
    channelId: number;
    caller?: any;
    offer?: any;
    isIncoming: boolean;
  } | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [showMeetingNotes, setShowMeetingNotes] = useState(false);
  const [meetingNotesText, setMeetingNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const ringtoneIntervalRef = useRef<any>(null);

  // Message Notification Chime Generator (Web Audio API)
  const playMessageChime = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      
      // Tone 1 (E5 - 659 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.2);

      // Tone 2 (A5 - 880 Hz)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime);
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.35);
      }, 100);
    } catch (e) {
      console.error('Message chime error:', e);
    }
  };

  // Audio Ringtone Generator (Web Audio API)
  const playRingtone = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const playBeep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      };

      playBeep();
      ringtoneIntervalRef.current = setInterval(playBeep, 2000);
    } catch (e) {
      console.error('Ringtone error:', e);
    }
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  };

  // Request browser Notification permissions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-bind streams when active call overlay mounts
  useEffect(() => {
    if (globalCall?.isInCall) {
      if (remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  }, [globalCall?.isInCall]);

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Loading
  const [loading, setLoading] = useState(false);

  // Light / Dark Theme State (Default: light)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Check login on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      connectSocket();
      fetchDashboardData(parsed);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput }),
      });

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      
      connectSocket();
      fetchDashboardData(data.user);
    } catch (e: any) {
      setLoginError(e.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    disconnectSocket();
  };

  const fetchDashboardData = async (currentUser: any) => {
    try {
      const usage = await apiRequest('/files/usage');
      const notesList = await apiRequest('/notes');
      const lettersList = await apiRequest('/letters');
      const filesList = await apiRequest('/files/folder/contents');

      setStats({
        filesCount: filesList.files.length,
        notesCount: notesList.length,
        lettersCount: lettersList.length,
        storageUsed: usage.usedBytes,
        storageTotal: usage.totalBytes,
      });

      const annList = await apiRequest('/announcements');
      setAnnouncements(annList);

      setPendingLetters(lettersList.filter((l: any) => l.status === 'PENDING_APPROVAL'));
      setRecentFiles(filesList.slice(0, 5));
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    }
  };

  const handleApproveLetter = async (id: number) => {
    try {
      await apiRequest(`/letters/${id}/approve`, { method: 'POST' });
      if (user) fetchDashboardData(user);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRejectLetter = async (id: number, reason: string) => {
    try {
      await apiRequest(`/letters/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (user) fetchDashboardData(user);
    } catch (e: any) {
      alert(e.message);
    }
  };

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const handleNotification = (data: any) => {
      fetchDashboardData(user);
      if (data?.message && data.message.senderId !== user.id) {
        playMessageChime(); // Audible chime sound on new message!

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const senderName = data.message.sender?.fullName || 'Colleague';
        const msgContent = data.message.content || 'Sent an attachment';

        setToastNotification({
          title: `New Message from ${senderName}`,
          message: msgContent,
          type: 'chat',
          time: timeStr,
        });

        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: `Message from ${senderName}`,
            message: msgContent,
            isRead: false,
            createdAt: timeStr,
            type: 'chat',
            targetTab: 'chat',
          },
          ...prev,
        ]);
      }
    };

    const handleFileShared = (data: any) => {
      if (data?.sharedWithId === user.id) {
        playMessageChime();
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const senderName = data.senderName || 'A colleague';
        const fileName = data.fileName || 'a document';

        setToastNotification({
          title: 'New File Shared',
          message: `${senderName} shared "${fileName}" with you.`,
          type: 'file',
          time: timeStr,
        });

        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: 'New File Shared',
            message: `${senderName} shared "${fileName}" with you.`,
            isRead: false,
            createdAt: timeStr,
            type: 'file',
            targetTab: 'files',
          },
          ...prev,
        ]);
        fetchDashboardData(user);
      }
    };

    // --- Global WebRTC Call Socket Handlers ---
    const handleIncomingCall = (data: any) => {
      if (data.caller?.id !== user.id) {
        playRingtone();

        setGlobalCall({
          isInCall: false,
          callType: data.callType,
          channelId: data.channelId,
          caller: data.caller,
          offer: data.offer,
          isIncoming: true,
        });

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const callTitle = `Incoming ${data.callType === 'video' ? 'Video Meeting' : 'Audio Call'}`;
        const callMsg = `${data.caller?.fullName || 'A colleague'} is calling you.`;

        setToastNotification({
          title: callTitle,
          message: callMsg,
          type: 'call',
          time: timeStr,
        });

        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: callTitle,
            message: callMsg,
            isRead: false,
            createdAt: timeStr,
            type: 'call',
            targetTab: 'chat',
          },
          ...prev,
        ]);

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(callTitle, {
            body: callMsg,
            icon: '/logo.png',
          });
        }
      }
    };

    const handleCallAccepted = async (data: any) => {
      stopRingtone();
      if (peerConnectionRef.current && data.answer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          
          // Flush pending ICE candidates
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            if (cand) {
              await peerConnectionRef.current.addIceCandidate(cand);
            }
          }
        } catch (e) {
          console.error('Error applying call answer:', e);
        }
      }
    };

    const handleIceCandidateReceived = async (data: any) => {
      if (!peerConnectionRef.current || !data.candidate) return;
      const candidate = new RTCIceCandidate(data.candidate);

      if (peerConnectionRef.current.remoteDescription && peerConnectionRef.current.remoteDescription.type) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate);
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    };

    const handleCallEnded = () => {
      stopRingtone();
      cleanUpCall();
    };

    const handleCallRejected = () => {
      stopRingtone();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          title: 'Missed Call',
          message: 'Call declined or missed.',
          isRead: false,
          createdAt: timeStr,
          type: 'call',
          targetTab: 'chat',
        },
        ...prev,
      ]);
      cleanUpCall();
    };

    socket.on('messageNotification', handleNotification);
    socket.on('fileSharedNotification', handleFileShared);
    socket.on('incomingCall', handleIncomingCall);
    socket.on('callAccepted', handleCallAccepted);
    socket.on('iceCandidate', handleIceCandidateReceived);
    socket.on('callEnded', handleCallEnded);
    socket.on('callRejected', handleCallRejected);

    return () => {
      socket.off('messageNotification', handleNotification);
      socket.off('fileSharedNotification', handleFileShared);
      socket.off('incomingCall', handleIncomingCall);
      socket.off('callAccepted', handleCallAccepted);
      socket.off('iceCandidate', handleIceCandidateReceived);
      socket.off('callEnded', handleCallEnded);
      socket.off('callRejected', handleCallRejected);
    };
  }, [user]);

  // Global WebRTC getUserMedia Helper
  const getUserMediaStream = async (type: 'audio' | 'video'): Promise<MediaStream> => {
    if (
      typeof window === 'undefined' ||
      (!navigator.mediaDevices &&
        !(navigator as any).getUserMedia &&
        !(navigator as any).webkitGetUserMedia &&
        !(navigator as any).mozGetUserMedia)
    ) {
      throw new Error(
        'WebRTC Audio/Video calls require HTTPS when accessed over LAN IP address (e.g. https://192.168.1.50). Browsers restrict camera/mic access over HTTP on non-localhost IPs.'
      );
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    }

    const legacyGetUserMedia =
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia;

    return new Promise<MediaStream>((resolve, reject) => {
      legacyGetUserMedia.call(navigator, { audio: true, video: type === 'video' }, resolve, reject);
    });
  };

  // Caller Initiates Call
  const startGlobalCall = async (channelId: number, type: 'audio' | 'video', isGroup: boolean = false) => {
    try {
      pendingCandidatesRef.current = [];
      remoteStreamRef.current = new MediaStream();

      const stream = await getUserMediaStream(type);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        } else if (event.track) {
          if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
          remoteStreamRef.current.addTrack(event.track);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const socket = getSocket();
          socket.emit('iceCandidate', {
            channelId,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const socket = getSocket();
      socket.emit('callUser', {
        channelId,
        offer,
        callType: type,
        isGroup,
      });

      setGlobalCall({
        isInCall: true,
        callType: type,
        channelId,
        isIncoming: false,
      });
    } catch (err: any) {
      alert(`Could not start ${type} call: ` + err.message);
    }
  };

  // Recipient Accepts Call
  const acceptGlobalCall = async () => {
    if (!globalCall || !globalCall.offer) {
      alert('Call details missing.');
      return;
    }
    stopRingtone();
    try {
      pendingCandidatesRef.current = [];
      remoteStreamRef.current = new MediaStream();

      const type = globalCall.callType;
      const stream = await getUserMediaStream(type);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        } else if (event.track) {
          if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
          remoteStreamRef.current.addTrack(event.track);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const socket = getSocket();
          socket.emit('iceCandidate', {
            channelId: globalCall.channelId,
            candidate: event.candidate,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(globalCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Flush candidates
      while (pendingCandidatesRef.current.length > 0) {
        const cand = pendingCandidatesRef.current.shift();
        if (cand) await pc.addIceCandidate(cand);
      }

      const socket = getSocket();
      socket.emit('answerCall', {
        channelId: globalCall.channelId,
        answer,
      });

      setGlobalCall({
        ...globalCall,
        isInCall: true,
        isIncoming: false,
      });
    } catch (err: any) {
      alert('Could not answer call: ' + err.message);
    }
  };

  const rejectGlobalCall = () => {
    stopRingtone();
    if (globalCall) {
      const socket = getSocket();
      socket.emit('rejectCall', { channelId: globalCall.channelId });
    }
    cleanUpCall();
  };

  const endGlobalCall = () => {
    stopRingtone();
    if (globalCall) {
      const socket = getSocket();
      socket.emit('endCall', { channelId: globalCall.channelId });
    }
    cleanUpCall();
  };

  const cleanUpCall = () => {
    stopRingtone();
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setGlobalCall(null);
    setIsMicMuted(false);
    setIsCamOff(false);
    setShowMeetingNotes(false);
    pendingCandidatesRef.current = [];
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
      await apiRequest('/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Meeting Minutes: (${new Date().toLocaleDateString()})`,
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

  // Global search debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const results = await apiRequest(`/search?q=${searchQuery}`);
          setSearchResults(results);
          setShowSearchModal(true);
        } catch (e) {
          console.error(e);
        }
      } else {
        setSearchResults(null);
        setShowSearchModal(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (!user) {
    // macOS Lock Screen Inspired Login Page
    return (
      <div className="min-h-screen flex items-center justify-center relative bg-background p-4 overflow-hidden select-none">
        {/* Soft Ambient Glow backdrop */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="w-full max-w-sm glass-panel rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 border border-border/80">
          {/* macOS window header traffic lights */}
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10 inline-block"></span>
          </div>

          <div className="text-center space-y-2">
            <div className="w-20 h-20 rounded-2xl bg-white p-2 flex items-center justify-center mx-auto shadow-md border border-border/40">
              <img src="/logo.png" alt="FCET Bichi Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight pt-1">
              OfficeConnect
            </h1>
            <p className="text-xs text-muted-foreground font-semibold">
              ICT Department — FCET Bichi
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            {loginError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-medium text-center">
                {loginError}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase px-1">Username</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. admin"
                required
                className="apple-input w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase px-1">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                required
                className="apple-input w-full"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="apple-button w-full py-2.5 font-semibold mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-border/40 text-center space-y-0.5">
            <p className="text-[11px] text-muted-foreground font-medium">
              Powered by <span className="font-bold text-foreground">Techspaceng</span>
            </p>
            <p className="text-[10px] text-muted-foreground/80 font-mono">
              techspace544@gmail.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans select-none overflow-hidden relative">
      {/* Mobile Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-xs z-40 md:hidden"
        ></div>
      )}

      {/* macOS Sidebar Navigation (Responsive Drawer on Mobile) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 w-64 glass-panel border-r border-border/60 flex flex-col shrink-0 z-50 transform transition-transform duration-300 md:transform-none ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* macOS Traffic Lights Header */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10 inline-block cursor-pointer"></span>
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10 inline-block cursor-pointer"></span>
            <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10 inline-block cursor-pointer"></span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src="/logo.png" alt="Logo" className="w-4 h-4 object-contain" />
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">OfficeConnect</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>

          <button
            onClick={() => { setActiveTab('files'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'files'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <HardDrive size={16} />
            File Center
          </button>

          <button
            onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare size={16} />
            Internal Chat
          </button>

          <button
            onClick={() => { setActiveTab('notes'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'notes'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText size={16} />
            Notes Workspace
          </button>

          <button
            onClick={() => { setActiveTab('letters'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'letters'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Send size={16} />
            Correspondence
          </button>

          {(user.role === 'SUPER_ADMIN' || user.role === 'DIRECTOR') && (
            <>
              <div className="pt-4 pb-1.5 px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Admin Console</span>
              </div>

              <button
                onClick={() => { setActiveTab('logs'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'logs'
                    ? 'bg-primary text-white font-semibold shadow-sm'
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldAlert size={16} />
                Audit Logs
              </button>

              <button
                onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'settings'
                    ? 'bg-primary text-white font-semibold shadow-sm'
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <SettingsIcon size={16} />
                Manage Staff
              </button>
            </>
          )}
        </nav>

        {/* User profile pill */}
        <div className="p-3 border-t border-border/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/40">
            <div className="flex items-center gap-2.5 truncate">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {user.fullName ? user.fullName.charAt(0) : 'U'}
              </div>
              <div className="truncate">
                <span className="font-semibold text-xs text-foreground block truncate">{user.fullName}</span>
                <span className="text-[10px] text-muted-foreground block truncate">@{user.username}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-all"
              title="Log Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        {/* Global Header Bar */}
        <header className="h-14 border-b border-border/40 flex items-center justify-between px-4 sm:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-all"
              title="Toggle Menu"
            >
              <Menu size={18} />
            </button>

            {/* Apple Pill Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-2.5 text-muted-foreground" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="apple-input w-full pl-9 pr-8 py-1.5 text-xs rounded-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 relative">
            {/* Notification Bell Button */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                className="p-1.5 rounded-full border border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer relative"
                title="Notifications"
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-white text-[9px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center border-2 border-background animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown (Scalable & Responsive) */}
              {showNotificationCenter && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 apple-card p-4 shadow-2xl border border-border/80 bg-background/95 backdrop-blur-2xl z-50 rounded-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex gap-2 my-2">
                    <button
                      onClick={() => setNotificationFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        notificationFilter === 'all'
                          ? 'bg-primary text-white'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      onClick={() => setNotificationFilter('unread')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        notificationFilter === 'unread'
                          ? 'bg-primary text-white'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {(notificationFilter === 'all'
                      ? notifications
                      : notifications.filter((n) => !n.isRead)
                    ).length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No {notificationFilter === 'unread' ? 'unread' : ''} notifications
                      </div>
                    ) : (
                      (notificationFilter === 'all'
                        ? notifications
                        : notifications.filter((n) => !n.isRead)
                      ).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationAsRead(notif.id, notif.targetTab)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                            !notif.isRead
                              ? 'bg-primary/5 border-primary/20'
                              : 'bg-secondary/30 border-transparent hover:bg-secondary'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            !notif.isRead ? 'bg-primary animate-pulse' : 'bg-transparent'
                          }`}></span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold truncate">{notif.title}</h4>
                              <span className="text-[9px] text-muted-foreground shrink-0">{notif.createdAt}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full border border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <div className="px-2.5 sm:px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">LAN Connected</span>
              <span className="sm:hidden">LAN</span>
            </div>
          </div>
        </header>

        {/* Page Content Panel */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          {/* Floating Toast Notification */}
          {toastNotification && (
            <div className="fixed top-16 right-6 z-50 max-w-sm w-full apple-card p-4 shadow-2xl border border-primary/30 bg-background/95 backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Bell size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-foreground truncate">{toastNotification.title}</h4>
                  <span className="text-[9px] text-muted-foreground shrink-0">{toastNotification.time}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{toastNotification.message}</p>
              </div>
              <button
                onClick={() => setToastNotification(null)}
                className="text-muted-foreground hover:text-foreground p-1 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Global Search Overlay */}
          {showSearchModal && searchResults && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-xl z-30 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/50">
                <h2 className="text-lg font-bold">Search Results for "{searchQuery}"</h2>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchModal(false);
                  }}
                  className="apple-button-secondary text-xs"
                >
                  Close Results
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Files & Folders */}
                <div className="apple-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase border-b border-border/40 pb-2">Files & Folders</h3>
                  {searchResults.files.length === 0 && searchResults.folders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No files or folders found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {searchResults.folders.map((fol: any) => (
                        <div key={fol.id} onClick={() => { setShowSearchModal(false); setSearchQuery(''); setActiveTab('files'); }} className="p-2 hover:bg-secondary rounded-lg border border-transparent hover:border-border/60 cursor-pointer flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="text-xs font-medium truncate">{fol.name} (Folder)</span>
                        </div>
                      ))}
                      {searchResults.files.map((file: any) => (
                        <div key={file.id} onClick={() => { setShowSearchModal(false); setSearchQuery(''); setActiveTab('files'); }} className="p-2 hover:bg-secondary rounded-lg border border-transparent hover:border-border/60 cursor-pointer flex items-center justify-between">
                          <span className="text-xs font-medium truncate">{file.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">v{file.versions?.length || 1}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="apple-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase border-b border-border/40 pb-2">Notes</h3>
                  {searchResults.notes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No notes found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {searchResults.notes.map((note: any) => (
                        <div key={note.id} onClick={() => { setShowSearchModal(false); setSearchQuery(''); setActiveTab('notes'); }} className="p-2 hover:bg-secondary rounded-lg border border-transparent hover:border-border/60 cursor-pointer">
                          <h4 className="text-xs font-semibold">{note.title}</h4>
                          <p className="text-[10px] text-muted-foreground truncate">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Letters */}
                <div className="apple-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase border-b border-border/40 pb-2">Correspondence</h3>
                  {searchResults.letters.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No letters found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {searchResults.letters.map((lettr: any) => (
                        <div key={lettr.id} onClick={() => { setShowSearchModal(false); setSearchQuery(''); setActiveTab('letters'); }} className="p-2 hover:bg-secondary rounded-lg border border-transparent hover:border-border/60 cursor-pointer">
                          <h4 className="text-xs font-semibold">{lettr.title}</h4>
                          <p className="text-[10px] text-muted-foreground font-mono">{lettr.referenceNumber || 'DRAFT'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chat Messages */}
                <div className="apple-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase border-b border-border/40 pb-2">Chat Messages</h3>
                  {searchResults.messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No chat messages found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {searchResults.messages.map((msg: any) => (
                        <div key={msg.id} onClick={() => { setShowSearchModal(false); setSearchQuery(''); setActiveTab('chat'); }} className="p-2 hover:bg-secondary rounded-lg border border-transparent hover:border-border/60 cursor-pointer">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{msg.sender?.fullName} in #{msg.channel?.name}</span>
                            <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs mt-1 italic">"{msg.content}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active Navigation Workspace Panel */}
          {activeTab === 'dashboard' && (
            <DashboardOverview
              user={user}
              stats={stats}
              announcements={announcements}
              pendingLetters={pendingLetters}
              recentFiles={recentFiles}
              onNavigate={(tab) => setActiveTab(tab)}
              onApproveLetter={handleApproveLetter}
              onRejectLetter={handleRejectLetter}
            />
          )}

          {activeTab === 'files' && (
            <FileCenter
              user={user}
              onRefreshStats={() => fetchDashboardData(user)}
            />
          )}

          {activeTab === 'chat' && (
            <ChatConsole
              user={user}
              onStartCall={startGlobalCall}
            />
          )}

          {activeTab === 'notes' && (
            <NotesWorkspace
              user={user}
              onRefreshStats={() => fetchDashboardData(user)}
            />
          )}

          {activeTab === 'letters' && (
            <LettersWorkflow
              user={user}
              onRefreshStats={() => fetchDashboardData(user)}
            />
          )}

          {activeTab === 'logs' && <AuditLogs />}

          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      {/* --- GLOBAL INCOMING CALL RINGING MODAL (Works across all pages) --- */}
      {globalCall?.isIncoming && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="apple-card max-w-sm w-full p-6 text-center space-y-6 border border-primary/30 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mx-auto border-2 border-primary/40">
                {globalCall.caller?.fullName?.charAt(0) || 'U'}
              </div>
              <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 rounded-full border-2 border-background animate-pulse"></span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">{globalCall.caller?.fullName}</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Incoming {globalCall.callType === 'video' ? 'Video Meeting' : 'Audio Call'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={rejectGlobalCall}
                className="w-12 h-12 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-all shadow-md cursor-pointer"
                title="Decline"
              >
                <PhoneOff size={20} />
              </button>

              <button
                onClick={acceptGlobalCall}
                className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shadow-md animate-bounce cursor-pointer"
                title="Accept Call"
              >
                {globalCall.callType === 'video' ? <Video size={20} /> : <Phone size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- GLOBAL ACTIVE AUDIO/VIDEO MEETING OVERLAY --- */}
      {globalCall?.isInCall && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-white/10 text-white">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold tracking-wide">
                {globalCall.callType === 'video' ? 'Live Video Meeting' : 'Live Audio Call'}
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
              {globalCall.callType === 'video' && (
                <div className="absolute bottom-6 right-6 w-36 sm:w-48 h-28 sm:h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-zinc-800">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted={true}
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
              <div className="w-full sm:w-80 absolute sm:relative inset-0 sm:inset-auto border-l border-white/10 bg-zinc-900/95 backdrop-blur-xl p-4 flex flex-col space-y-3 z-10 text-white">
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

            {globalCall.callType === 'video' && (
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
              onClick={endGlobalCall}
              className="w-14 h-14 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-all shadow-xl cursor-pointer"
              title="End Call"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
