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
  X
} from 'lucide-react';

function Meeting() {
  const { meetingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { userName, isHost } = location.state || {};


  const [socket , setSocket]=useState(null);
  const [socketConnected, setSocketConnected]= useState(false);
  const[participants, setParticipants]= useState([]);
  const [chatMessages, setCHatMessages]= useState([]);
  const[showChat , seShowChat]= useState (false);
  const [showParticipants, setShowParticipants]=useState (false);
  const[showMobileMenu, setShowMobileMenu]= useState( false);
  const [ connectionError, setConnectionError]= useState(false);
 
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

    socketInstance.on('connect', handleConnect);
    socketInstance.on('connect_error', handleConnectError);
    socketInstance.on('meeting-joined', handleMeetingJoined);
    socketInstance.on('user-joined', handleUserJoined);
    socketInstance.on('user-left', handleUserLeft);
    socketInstance.on('new-message', handleNewMessage);
    socketInstance.on('meeting-error', handleMeetingError);

    return () => {
      console.log('Cleaning up meeting...');
      socketInstance.off('connect', handleConnect);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.off('meeting-joined', handleMeetingJoined);
      socketInstance.off('user-joined', handleUserJoined);
      socketInstance.off('user-left', handleUserLeft);
      socketInstance.off('new-message', handleNewMessage);
      socketInstance.off('meeting-error', handleMeetingError);
    };
  }, [meetingId, userName, isHost, navigate]);

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

  // closes moblie jb screen change hogi
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
        <div className="hidden md:flex items-center space-x-2">
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

          <button
            onClick={leaveMeeting}
            className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="Leave meeting"
          >
            <PhoneOff size={18} />
          </button>
        </div>

        <div className="flex md:hidden items-center space-x-1">
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
                  className={`flex items-center space-x-3 p-3 rounded-lg mb-2 ${
                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                >
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
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Meeting;