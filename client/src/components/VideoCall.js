import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Settings
} from 'lucide-react';

function VideoCall({ socket, participants, userName, meetingId, isDark }) {
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef(new Map());
  const [localStream, setLocalStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const peerConnections = useRef(new Map());

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (!socket) return;

    console.log('Initializing video call for meeting:', meetingId);
    initializeMedia();
    setupSocketListeners();

    return () => {
      console.log('Cleaning up video call...');
      cleanup();
    };
  }, [socket, meetingId]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access camera and microphone. Please check your permissions.');
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
  };

  const createPeerConnection = (userId) => {
    const peerConnection = new RTCPeerConnection(configuration);

    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          target: userId,
          candidate: event.candidate
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteVideo = remoteVideosRef.current.get(userId);
      if (remoteVideo && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
      }
    };

    peerConnections.current.set(userId, peerConnection);
    return peerConnection;
  };

  const handleUserJoined = async (data) => {
    const { user } = data;
    if (user.socketId === socket.id) return;

    const peerConnection = createPeerConnection(user.socketId);

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('offer', {
        target: user.socketId,
        offer: offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleOffer = async (data) => {
    const { offer, sender } = data;
    const peerConnection = createPeerConnection(sender);

    try {
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('answer', {
        target: sender,
        answer: answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (data) => {
    const { answer, sender } = data;
    const peerConnection = peerConnections.current.get(sender);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer);
    }
  };

  const handleIceCandidate = async (data) => {
    const { candidate, sender } = data;
    const peerConnection = peerConnections.current.get(sender);
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate);
    }
  };

  const handleUserLeft = (data) => {
    const { userId } = data;
    const peerConnection = peerConnections.current.get(userId);
    if (peerConnection) {
      peerConnection.close();
      peerConnections.current.delete(userId);
    }

    const remoteVideo = remoteVideosRef.current.get(userId);
    if (remoteVideo) {
      remoteVideo.srcObject = null;
      remoteVideosRef.current.delete(userId);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
        socket.emit('toggle-audio', { enabled: audioTrack.enabled });
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
        socket.emit('toggle-video', { enabled: videoTrack.enabled });
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true
        });

        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
        socket.emit('start-screen-share', { streamId: screenStream.id });
      } else {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
        });

        const videoTrack = cameraStream.getVideoTracks()[0];
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
        }

        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        setLocalStream(cameraStream);
        setIsScreenSharing(false);
        socket.emit('stop-screen-share');
      }
    } catch (error) {
      console.error('Error screen sharing:', error);
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
  };

  const setRemoteVideoRef = (userId, element) => {
    if (element) {
      remoteVideosRef.current.set(userId, element);
    } else {
      remoteVideosRef.current.delete(userId);
    }
  };

  const getGridClass = () => {
    const totalVideos = participants.filter(p => p.socketId !== socket?.id).length + 1;
    
    if (totalVideos === 1) return 'grid-cols-1';
    if (totalVideos === 2) return 'grid-cols-1 xs:grid-cols-2';
    if (totalVideos <= 4) return 'grid-cols-1 xs:grid-cols-2';
    if (totalVideos <= 6) return 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  };

  const getVideoSizeClass = () => {
    const totalVideos = participants.filter(p => p.socketId !== socket?.id).length + 1;
    
    if (totalVideos === 1) return 'h-full';
    if (totalVideos <= 4) return 'aspect-video';
    return 'aspect-video xs:aspect-square';
  };

  const remoteParticipants = participants.filter(participant => participant.socketId !== socket?.id);

  return (
    <div className="h-full flex flex-col p-2 xs:p-3 sm:p-4 space-y-3 xs:space-y-4">
      <div className={`flex-1 grid ${getGridClass()} gap-2 xs:gap-3 sm:gap-4 p-2 xs:p-3 sm:p-4 overflow-hidden`}>
        <div className={`video-container ${getVideoSizeClass()} relative group`}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover rounded-lg xs:rounded-xl"
          />
          <div className={`absolute top-2 left-2 xs:top-3 xs:left-3 px-2 xs:px-3 py-1 rounded-full text-xs xs:text-sm font-semibold text-shadow ${
            isDark ? 'bg-black/50 text-white' : 'bg-white/90 text-gray-800'
          }`}>
            {userName} (You)
            {!videoEnabled && ' • Camera Off'}
            {isScreenSharing && ' • Sharing'}
          </div>
          
          {!videoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg xs:rounded-xl">
              <div className="text-center">
                <div className={`w-12 h-12 xs:w-16 xs:h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  isDark ? 'bg-gray-700' : 'bg-gray-300'
                }`}>
                  <VideoOff size={20} className={`xs:w-6 xs:h-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </div>
                <p className={`text-xs xs:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Camera is off
                </p>
              </div>
            </div>
          )}
        </div>
        {remoteParticipants.map(participant => (
          <div key={participant.socketId} className={`video-container ${getVideoSizeClass()} relative group`}>
            <video
              ref={(el) => setRemoteVideoRef(participant.socketId, el)}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-lg xs:rounded-xl"
            />
            <div className={`absolute top-2 left-2 xs:top-3 xs:left-3 px-2 xs:px-3 py-1 rounded-full text-xs xs:text-sm font-semibold text-shadow ${
              isDark ? 'bg-black/50 text-white' : 'bg-white/90 text-gray-800'
            }`}>
              {participant.name}
            </div>
          </div>
        ))}
      </div>

      <div className={`rounded-lg xs:rounded-xl p-3 xs:p-4 mx-auto w-full max-w-2xl ${
        isDark ? 'glass-dark' : 'bg-white/80 backdrop-blur-md shadow-lg'
      }`}>
        <div className="flex justify-center space-x-2 xs:space-x-3 sm:space-x-4">
          
          <button
            onClick={toggleAudio}
            className={`control-btn ${
              audioEnabled ? 'control-btn-primary' : 'control-btn-danger'
            }`}
            title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {audioEnabled ? <Mic size={16} className="xs:w-5 xs:h-5" /> : <MicOff size={16} className="xs:w-5 xs:h-5" />}
          </button>

       
          <button
            onClick={toggleVideo}
            className={`control-btn ${
              videoEnabled ? 'control-btn-primary' : 'control-btn-danger'
            }`}
            title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {videoEnabled ? <Video size={16} className="xs:w-5 xs:h-5" /> : <VideoOff size={16} className="xs:w-5 xs:h-5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`control-btn ${
              isScreenSharing ? 'control-btn-warning' : 'control-btn-primary'
            }`}
            title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff size={16} className="xs:w-5 xs:h-5" /> : <Monitor size={16} className="xs:w-5 xs:h-5" />}
          </button>
        </div>
      </div>

      <div className={`text-center text-xs xs:text-sm ${
        isDark ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <p>
          {remoteParticipants.length} other participant{remoteParticipants.length !== 1 ? 's' : ''} in call
          {isScreenSharing && ' • You are sharing your screen'}
        </p>
      </div>
    </div>
  );
}

export default VideoCall;