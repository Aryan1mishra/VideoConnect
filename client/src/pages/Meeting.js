import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { socketService } from '../utils/socket';
import VideoCall from '../components/VideoCall';
import Chat from '../components/Chat';
import {
  Sun,
  Moon,
  Copy,
  MessageCircle,
  Users,
  PhoneOff,
  Menu,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  UserPlus,
  UserMinus,
  Power
} from 'lucide-react';

function Meeting() {
  const { meetingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { userName, isHost } = location.state || {};

  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showPendingApprovals, setShowPendingApprovals] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);

  useEffect(() => {
    if (!userName || !meetingId) {
      navigate('/');
      return;
    }

    const socketInstance = socketService.connect();
    setSocket(socketInstance);

    const handleConnect = () => {
      console.log('Socket connected, joining meeting...');
      setSocketConnected(true);
      setConnectionError(false);
      
      socketInstance.emit('join-meeting', {
        meetingId,
        userData: { 
          name: userName, 
          id: socketInstance.id,
          isHost 
        }
      });
    };

    const handleConnectError = (error) => {
      console.error('Socket connection error:', error);
      setConnectionError(true);
      setSocketConnected(false);
    };

    const handleMeetingJoined = (data) => {
      console.log('Meeting joined successfully:', data);
      setParticipants(data.participants || []);
      setChatMessages(data.chat || []);
      setWaitingForApproval(false);
    };

    const handleUserJoined = (data) => {
      console.log('User joined:', data.user);
      setParticipants(data.participants || []);
    };

    const handleUserLeft = (data) => {
      console.log('User left:', data.userId);
      setParticipants(data.participants || []);
    };

    const handleNewMessage = (message) => {
      setChatMessages(prev => [...prev, message]);
    };

    const handleMeetingError = (data) => {
      alert(data.message);
      navigate('/');
    };

    // Admin features handlers
    const handleUserWaitingApproval = (data) => {
      if (isHost) {
        setPendingUsers(prev => [...prev, data]);
        setShowPendingApprovals(true);
      }
    };

    const handleWaitingForApproval = (data) => {
      setWaitingForApproval(true);
    };

    const handleJoinDeclined = (data) => {
      alert(data.message);
      navigate('/');
    };

    const handleKickedFromMeeting = (data) => {
      alert(data.message);
      if (socketInstance) {
        socketInstance.disconnect();
      }
      navigate('/');
    };

    const handleMeetingEndedByHost = (data) => {
      alert(data.message);
      if (socketInstance) {
        socketInstance.disconnect();
      }
      navigate('/');
    };

    const handleForceToggleAudio = (data) => {
      // This will be handled in VideoCall component
      console.log('Admin forced audio toggle:', data);
    };

    const handleForceToggleVideo = (data) => {
      // This will be handled in VideoCall component
      console.log('Admin forced video toggle:', data);
    };

    const handleUserKicked = (data) => {
      console.log(`User ${data.userName} was kicked by ${data.byAdmin}`);
      setParticipants(prev => prev.filter(p => p.socketId !== data.userId));
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('connect_error', handleConnectError);
    socketInstance.on('meeting-joined', handleMeetingJoined);
    socketInstance.on('user-joined', handleUserJoined);
    socketInstance.on('user-left', handleUserLeft);
    socketInstance.on('new-message', handleNewMessage);
    socketInstance.on('meeting-error', handleMeetingError);
    
    // Admin feature listeners
    socketInstance.on('user-waiting-approval', handleUserWaitingApproval);
    socketInstance.on('waiting-for-approval', handleWaitingForApproval);
    socketInstance.on('join-declined', handleJoinDeclined);
    socketInstance.on('kicked-from-meeting', handleKickedFromMeeting);
    socketInstance.on('meeting-ended-by-host', handleMeetingEndedByHost);
    socketInstance.on('force-toggle-audio', handleForceToggleAudio);
    socketInstance.on('force-toggle-video', handleForceToggleVideo);
    socketInstance.on('user-kicked', handleUserKicked);

    return () => {
      console.log('Cleaning up meeting...');
      socketInstance.off('connect', handleConnect);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.off('meeting-joined', handleMeetingJoined);
      socketInstance.off('user-joined', handleUserJoined);
      socketInstance.off('user-left', handleUserLeft);
      socketInstance.off('new-message', handleNewMessage);
      socketInstance.off('meeting-error', handleMeetingError);
      socketInstance.off('user-waiting-approval', handleUserWaitingApproval);
      socketInstance.off('waiting-for-approval', handleWaitingForApproval);
      socketInstance.off('join-declined', handleJoinDeclined);
      socketInstance.off('kicked-from-meeting', handleKickedFromMeeting);
      socketInstance.off('meeting-ended-by-host', handleMeetingEndedByHost);
      socketInstance.off('force-toggle-audio', handleForceToggleAudio);
      socketInstance.off('force-toggle-video', handleForceToggleVideo);
      socketInstance.off('user-kicked', handleUserKicked);
    };
  }, [meetingId, userName, isHost, navigate]);

  // Admin functions
  const approveUser = (socketId, approved) => {
    if (socket && isHost) {
      socket.emit('approve-user', { targetSocketId: socketId, approved });
      setPendingUsers(prev => prev.filter(user => user.socketId !== socketId));
      
      if (pendingUsers.length === 1) {
        setShowPendingApprovals(false);
      }
    }
  };

  const toggleUserAudio = (socketId, enabled) => {
    if (socket && isHost) {
      socket.emit('admin-toggle-audio', { targetSocketId: socketId, enabled });
    }
  };

  const toggleUserVideo = (socketId, enabled) => {
    if (socket && isHost) {
      socket.emit('admin-toggle-video', { targetSocketId: socketId, enabled });
    }
  };

  const kickUser = (socketId) => {
    if (socket && isHost) {
      if (window.confirm('Are you sure you want to remove this participant?')) {
        socket.emit('kick-user', { targetSocketId: socketId });
      }
    }
  };

  const endMeetingForAll = () => {
    if (socket && isHost) {
      if (window.confirm('Are you sure you want to end the meeting for everyone?')) {
        socket.emit('end-meeting-for-all');
      }
    }
  };

  const sendMessage = (text) => {
    if (socket && text.trim()) {
      socket.emit('send-message', { text });
    }
  };

  const copyMeetingLink = () => {
    const meetingLink = `${window.location.origin}/meeting/${meetingId}`;
    navigator.clipboard.writeText(meetingLink)
      .then(() => {
        console.log('Meeting link copied to clipboard');
      })
      .catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = meetingLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
  };

  const leaveMeeting = () => {
    if (socket) {
      socket.disconnect();
    }
    navigate('/');
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileMenu(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (connectionError) {
    return (
      <div className={`h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center p-6 mobile-container">
          <div className="text-red-500 text-5xl xs:text-6xl mb-4">⚠️</div>
          <h2 className={`text-xl xs:text-2xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-800'
          }`}>
            Connection Error
          </h2>
          <p className={`mb-6 text-sm xs:text-base ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Unable to connect to the meeting server.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors font-semibold text-sm xs:text-base"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (waitingForApproval) {
    return (
      <div className={`h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center p-6 mobile-container">
          <div className="animate-pulse">
            <UserPlus size={64} className="mx-auto mb-4 text-blue-500" />
          </div>
          <h2 className={`text-xl xs:text-2xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-800'
          }`}>
            Waiting for Approval
          </h2>
          <p className={`mb-6 text-sm xs:text-base ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            The host needs to approve your request to join the meeting.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!socketConnected) {
    return (
      <div className={`h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center p-6 mobile-container">
          <div className="animate-spin rounded-full h-14 xs:h-16 w-14 xs:w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className={`text-lg xs:text-xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-800'
          }`}>
            Connecting to meeting...
          </h2>
          <p className={`text-sm xs:text-base ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Please wait while we establish your connection
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      
      <header className={`h-14 xs:h-16 px-3 xs:px-4 flex items-center justify-between transition-colors duration-300 ${
        isDark ? 'bg-gray-800' : 'bg-white shadow-sm'
      }`}>
        
        <div className="flex items-center space-x-2 xs:space-x-3">
          
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-1 rounded-lg transition-colors"
          >
            {showMobileMenu ? (
              <X size={20} className={isDark ? 'text-gray-300' : 'text-gray-700'} />
            ) : (
              <Menu size={20} className={isDark ? 'text-gray-300' : 'text-gray-700'} />
            )}
          </button>

          <div className={`p-1 xs:p-2 rounded-lg ${
            isDark ? 'bg-blue-500' : 'bg-blue-100 text-blue-600'
          }`}>
            <Users size={16} className="xs:w-5 xs:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-sm xs:text-base font-semibold truncate max-w-[120px] xs:max-w-[200px] ${
              isDark ? 'text-white' : 'text-gray-800'
            }`}>
              {meetingId}
            </h1>
            <p className={`text-xs truncate max-w-[120px] xs:max-w-[200px] ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {userName} {isHost && '• Host'}
            </p>
          </div>
        </div>

        {/* Admin badge for mobile */}
        {isHost && (
          <div className="md:hidden">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              isDark ? 'bg-yellow-600 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
            }`}>
              Host
            </span>
          </div>
       ) }

        <div className="hidden md:flex items-center space-x-2">
          {/* Pending approvals badge for admin */}
          {isHost && pendingUsers.length > 0 && (
            <button
              onClick={() => setShowPendingApprovals(true)}
              className={`p-2 rounded-lg transition-colors relative ${
                isDark 
                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
              title={`${pendingUsers.length} pending approvals`}
            >
              <UserPlus size={18} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingUsers.length}
              </span>
            </button>
          )}

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={copyMeetingLink}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Copy meeting link"
          >
            <Copy size={18} />
          </button>

          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`p-2 rounded-lg transition-colors relative ${
              isDark 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${
              showParticipants ? (isDark ? 'bg-blue-500' : 'bg-blue-100 text-blue-600') : ''
            }`}
            title="View participants"
          >
            <Users size={18} />
            {participants.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 xs:w-5 xs:h-5 flex items-center justify-center">
                {participants.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-lg transition-colors relative ${
              isDark 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${
              showChat ? (isDark ? 'bg-blue-500' : 'bg-blue-100 text-blue-600') : ''
            }`}
            title="Toggle chat"
          >
            <MessageCircle size={18} />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 xs:w-5 xs:h-5 flex items-center justify-center">
                {chatMessages.length}
              </span>
            )}
          </button>

          {/* End meeting for all (admin only) */}
          {isHost && (
            <button
              onClick={endMeetingForAll}
              className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              title="End meeting for everyone"
            >
              <Power size={18} />
            </button>
          )}

          <button
            onClick={leaveMeeting}
            className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="Leave meeting"
          >
            <PhoneOff size={18} />
          </button>
        </div>

        <div className="flex md:hidden items-center space-x-1">
          {/* Pending approvals for mobile */}
          {isHost && pendingUsers.length > 0 && (
            <button
              onClick={() => setShowPendingApprovals(true)}
              className={`p-2 rounded-lg transition-colors relative ${
                isDark 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              <UserPlus size={18} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {pendingUsers.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-lg transition-colors relative ${
              showChat ? (isDark ? 'bg-blue-500' : 'bg-blue-100 text-blue-600') : ''
            }`}
          >
            <MessageCircle size={18} />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {chatMessages.length}
              </span>
            )}
          </button>

          <button
            onClick={leaveMeeting}
            className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            <PhoneOff size={18} />
          </button>
        </div>
      </header>

      {showMobileMenu && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
          <div className="p-4 space-y-3">
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isDark 
                  ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
              <span className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button
              onClick={copyMeetingLink}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isDark 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Copy size={20} />
              <span className="font-medium">Copy Link</span>
            </button>

            <button
              onClick={() => {
                setShowParticipants(!showParticipants);
                setShowMobileMenu(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isDark 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users size={20} />
              <span className="font-medium">Participants ({participants.length})</span>
            </button>

            {/* Admin options for mobile */}
            {isHost && (
              <>
                <button
                  onClick={() => {
                    setShowPendingApprovals(true);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    isDark 
                      ? 'bg-orange-500 text-white hover:bg-orange-600' 
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
                >
                  <UserPlus size={20} />
                  <span className="font-medium">Pending ({pendingUsers.length})</span>
                </button>

                <button
                  onClick={() => {
                    endMeetingForAll();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <Power size={20} />
                  <span className="font-medium">End Meeting</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      <div className={`h-[calc(100vh-56px)] xs:h-[calc(100vh-144px)] flex ${
        showChat ? 'flex-col md:flex-row' : 'flex-col'
      }`}>

        <div className={`${showChat ? 'h-2/3 md:h-full md:w-3/4' : 'h-full w-full'} transition-all duration-300`}>
          <VideoCall
            socket={socket}
            participants={participants}
            userName={userName}
            meetingId={meetingId}
            isDark={isDark}
            isHost={isHost}
            onToggleUserAudio={toggleUserAudio}
            onToggleUserVideo={toggleUserVideo}
            onKickUser={kickUser}
          />
        </div>

        {showChat && (
          <div className={`${
            showChat 
              ? 'h-1/3 md:h-full md:w-1/4 border-t md:border-t-0 md:border-l' 
              : 'hidden'
          } transition-colors duration-300 ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <Chat
              messages={chatMessages}
              onSendMessage={sendMessage}
              currentUser={userName}
              isDark={isDark}
            />
          </div>
        )}
      </div>

      {/* Pending Approvals Modal */}
      {showPendingApprovals && isHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`rounded-xl p-6 max-w-md w-full mx-4 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-gray-800'
              }`}>
                Pending Approvals ({pendingUsers.length})
              </h3>
              <button
                onClick={() => setShowPendingApprovals(false)}
                className={`p-1 rounded-lg ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {pendingUsers.map((user) => (
                <div
                  key={user.socketId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isDark ? 'bg-gray-700' : 'bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {user.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={isDark ? 'text-white' : 'text-gray-800'}>
                        {user.user.name}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Waiting to join
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => approveUser(user.socketId, true)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      title="Approve"
                    >
                      <UserPlus size={16} />
                    </button>
                    <button
                      onClick={() => approveUser(user.socketId, false)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      title="Decline"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowPendingApprovals(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDark 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants List with Admin Controls */}
      {showParticipants && (
        <div className={`fixed inset-0 md:inset-auto md:top-16 md:right-4 md:w-80 md:h-[calc(100vh-80px)] ${
          showParticipants ? 'z-50' : 'hidden'
        }`}>
          <div className={`h-full md:rounded-xl md:shadow-2xl transition-all duration-300 ${
            isDark ? 'glass-dark' : 'bg-white shadow-xl'
          }`}>
            <div className="p-3 xs:p-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
              <h3 className={`font-semibold text-sm xs:text-base ${
                isDark ? 'text-white' : 'text-gray-800'
              }`}>
                Participants ({participants.length})
              </h3>
              <button
                onClick={() => setShowParticipants(false)}
                className={`p-1 rounded-lg ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="h-[calc(100%-80px)] overflow-y-auto custom-scrollbar p-2">
              {participants.map((participant, index) => (
                <div
                  key={participant.socketId}
                  className={`flex items-center justify-between p-3 rounded-lg mb-2 ${
                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-8 h-8 xs:w-10 xs:h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                      index % 4 === 0 ? 'bg-blue-500' :
                      index % 4 === 1 ? 'bg-green-500' :
                      index % 4 === 2 ? 'bg-purple-500' : 'bg-orange-500'
                    }`}>
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isDark ? 'text-white' : 'text-gray-800'
                      }`}>
                        {participant.name}
                        {participant.socketId === socket?.id && ' (You)'}
                        {participant.isHost && ' 👑'}
                      </p>
                      <p className={`text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {participant.socketId === socket?.id ? 'Connected' : 'Online'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Admin controls */}
                  {isHost && !participant.isHost && (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => toggleUserAudio(participant.socketId, true)}
                        className="p-1 text-green-500 hover:bg-green-500 hover:text-white rounded transition-colors"
                        title="Unmute"
                      >
                        <Mic size={14} />
                      </button>
                      <button
                        onClick={() => toggleUserAudio(participant.socketId, false)}
                        className="p-1 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                        title="Mute"
                      >
                        <MicOff size={14} />
                      </button>
                      <button
                        onClick={() => toggleUserVideo(participant.socketId, true)}
                        className="p-1 text-green-500 hover:bg-green-500 hover:text-white rounded transition-colors"
                        title="Enable Video"
                      >
                        <Video size={14} />
                      </button>
                      <button
                        onClick={() => toggleUserVideo(participant.socketId, false)}
                        className="p-1 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                        title="Disable Video"
                      >
                        <VideoOff size={14} />
                      </button>
                      <button
                        onClick={() => kickUser(participant.socketId)}
                        className="p-1 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                        title="Remove"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Meeting;