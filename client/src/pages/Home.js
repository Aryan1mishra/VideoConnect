import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Video, 
 
  Moon, 
  Sun, 
  ArrowRight,
  Plus,
  LogIn
} from 'lucide-react';
import api from '../utils/api';

function Home() {
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const createMeeting = async () => {
    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/api/meetings/create');
      const { meetingId } = response.data;
      
      navigate(`/meeting/${meetingId}`, { 
        state: { 
          userName: userName.trim(),
          isHost: true 
        } 
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('Failed to create meeting. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const joinMeeting = async () => {
    if (!meetingId.trim() || !userName.trim()) {
      alert('Please enter both meeting ID and your name');
      return;
    }

    setIsJoining(true);
    try {
      const response = await api.get(`/api/meetings/${meetingId.trim()}`);
      
      if (response.data.exists) {
        navigate(`/meeting/${meetingId}`, { 
          state: { 
            userName: userName.trim(),
            isHost: false 
          } 
        });
      } else {
        alert('Meeting not found. Please check the meeting ID.');
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      alert('Failed to join meeting. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (meetingId.trim()) {
        joinMeeting();
      } else {
        createMeeting();
      }
    }
  };

  return (
    <div className={`h-screen overflow-hidden transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      <header className="fixed top-0 left-0 right-0 z-50 p-3 xs:p-4 sm:p-6 flex justify-between items-center">
        <div className="flex items-center space-x-2 xs:space-x-3">
          <div className={`p-1 xs:p-2 rounded-lg ${
            isDark ? 'bg-blue-500' : 'bg-blue-100 text-blue-600'
          }`}>
            <Video size={20} className="xs:w-6 xs:h-6" />
          </div>
          <h1 className={`text-lg xs:text-xl sm:text-2xl font-bold ${
            isDark ? 'text-white' : 'text-gray-800'
          }`}>
            VideoConnect Aryan 102203357
          </h1>
        </div>
        
        <button
          onClick={toggleTheme}
          className={`p-2 xs:p-3 rounded-full transition-all duration-300 ${
            isDark 
              ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' 
              : 'bg-white text-gray-700 shadow-md hover:shadow-lg'
          }`}
        >
          {isDark ? <Sun size={16} className="xs:w-5 xs:h-5" /> : <Moon size={16} className="xs:w-5 xs:h-5" />}
        </button>
      </header>

      <div className="h-full flex items-center justify-center mobile-container pt-16 pb-4">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
          
          <div className="text-center lg:text-left space-y-4 xs:space-y-6 animate-fade-in order-2 lg:order-1">
            <h2 className={`text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight ${
              isDark ? 'text-white' : 'text-gray-800'
            }`}>
              Let's
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
               Connect
              </span>
            </h2>
            
            <p className={`text-base xs:text-lg lg:text-xl leading-relaxed ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Connect with anyone, anywhere. 
              <span className="block">Crystal clear video and audio.</span>
            </p>

            <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 xs:gap-3 sm:gap-4 pt-4">
              <div className={`p-2 xs:p-3 sm:p-4 rounded-lg xs:rounded-xl text-center ${
                isDark ? 'bg-gray-800' : 'bg-white shadow-md'
              }`}>
                <span className="text-lg xs:text-xl">👥</span>
                <p className={`text-xs xs:text-sm font-medium mt-1 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Multi-user
                </p>
              </div>
              <div className={`p-2 xs:p-3 sm:p-4 rounded-lg xs:rounded-xl text-center ${
                isDark ? 'bg-gray-800' : 'bg-white shadow-md'
              }`}>
                <span className="text-lg xs:text-xl">🎥</span>
                <p className={`text-xs xs:text-sm font-medium mt-1 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  HD Video
                </p>
              </div>
              <div className={`p-2 xs:p-3 sm:p-4 rounded-lg xs:rounded-xl text-center ${
                isDark ? 'bg-gray-800' : 'bg-white shadow-md'
              }`}>
                <span className="text-lg xs:text-xl">🖥️</span>
                <p className={`text-xs xs:text-sm font-medium mt-1 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Screen Share
                </p>
              </div>
              <div className={`p-2 xs:p-3 sm:p-4 rounded-lg xs:rounded-xl text-center ${
                isDark ? 'bg-gray-800' : 'bg-white shadow-md'
              }`}>
                <span className="text-lg xs:text-xl">💬</span>
                <p className={`text-xs xs:text-sm font-medium mt-1 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Live Chat
                </p>
              </div>
              <div className={`p-2 xs:p-3 sm:p-4 rounded-lg xs:rounded-xl text-center ${
                isDark ? 'bg-gray-800' : 'bg-white shadow-md'
              }`}>
                <span className="text-lg xs:text-xl">🔒</span>
                <p className={`text-xs xs:text-sm font-medium mt-1 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Secure
                </p>
              </div>
              
            </div>
          </div>

          <div className={`rounded-xl xs:rounded-2xl p-4 xs:p-6 sm:p-8 shadow-xl xs:shadow-2xl transition-all duration-300 ${
            isDark ? 'glass-dark' : 'bg-white shadow-lg xs:shadow-xl'
          } order-1 lg:order-2`}>
            <div className="space-y-4 xs:space-y-6">
              <div>
                <label className={`block text-sm xs:text-base font-semibold mb-2 xs:mb-3 ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Your Name *
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your name"
                  className={`w-full px-3 xs:px-4 py-2 xs:py-3 rounded-lg xs:rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mobile-text ${
                    isDark 
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                  maxLength={50}
                />
              </div>

              <div className="space-y-3 xs:space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className={`w-full border-t ${
                      isDark ? 'border-gray-600' : 'border-gray-300'
                    }`}></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className={`px-2 xs:px-3 ${
                      isDark ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
                    }`}>
                      Join with meeting ID
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter meeting ID"
                    className={`w-full px-3 xs:px-4 py-2 xs:py-3 rounded-lg xs:rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mobile-text ${
                      isDark 
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                    }`}
                  />
                  <button
                    onClick={joinMeeting}
                    disabled={isJoining}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-2 xs:py-3 px-4 xs:px-6 rounded-lg xs:rounded-xl transition-all duration-200 font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none mobile-text"
                  >
                    <LogIn size={18} className="xs:w-5 xs:h-5" />
                    <span>{isJoining ? 'Joining...' : 'Join Meeting'}</span>
                    <ArrowRight size={18} className="xs:w-5 xs:h-5" />
                  </button>
                </div>
              </div>

              <div className="pt-3 xs:pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={createMeeting}
                  disabled={isCreating}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-2 xs:py-3 px-4 xs:px-6 rounded-lg xs:rounded-xl transition-all duration-200 font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none mobile-text"
                >
                  <Plus size={18} className="xs:w-5 xs:h-5" />
                  <span>{isCreating ? 'Creating...' : 'Create New Meeting'}</span>
                  <Video size={18} className="xs:w-5 xs:h-5" />
                </button>
              </div>
            </div>

            <div className={`mt-4 xs:mt-6 text-center text-xs xs:text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <p>No account required • Free forever • End-to-end encrypted</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;