import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff
} from 'lucide-react';

function VideoCall({ socket, participants, userName, meetingId, isDark }) {
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef(new Map());
  const [localStream, setLocalStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const peerConnections = useRef(new Map());

  useEffect(() => {
    if (!socket) return;

    initializeMedia();
    setupSocketListeners();

    return () => {
      cleanup();
    };
  }, [socket, meetingId]);

  useEffect(() => {
    const remoteParticipants = participants.filter(p => p.socketId !== socket?.id);
    
    remoteParticipants.forEach(participant => {
      if (!peerConnections.current.has(participant.socketId)) {
        createPeerConnection(participant.socketId);
      }
    });

    peerConnections.current.forEach((pc, userId) => {
      if (!remoteParticipants.find(p => p.socketId === userId)) {
        pc.close();
        peerConnections.current.delete(userId);
        
        const remoteVideo = remoteVideosRef.current.get(userId);
        if (remoteVideo) {
          remoteVideo.srcObject = null;
          remoteVideosRef.current.delete(userId);
        }
      }
    });
  }, [participants, socket]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-joined', handleUserJoined);
  };

  const handleUserJoined = (data) => {
    const { user } = data;
    if (user.socketId === socket.id) return;
    createPeerConnection(user.socketId);
  };

  const createPeerConnection = (userId) => {
    if (peerConnections.current.has(userId)) {
      return peerConnections.current.get(userId);
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          target: userId,
          candidate: event.candidate,
          meetingId: meetingId
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

    createOffer(userId, peerConnection);

    return peerConnection;
  };

  const createOffer = async (userId, peerConnection) => {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('offer', {
        target: userId,
        offer: offer,
        meetingId: meetingId
      });

    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleOffer = async (data) => {
    const { offer, sender } = data;
    
    let peerConnection = peerConnections.current.get(sender);
    if (!peerConnection) {
      peerConnection = createPeerConnection(sender);
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('answer', {
        target: sender,
        answer: answer,
        meetingId: meetingId
      });

    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (data) => {
    const { answer, sender } = data;
    const peerConnection = peerConnections.current.get(sender);
    
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    }
  };

  const handleIceCandidate = async (data) => {
    const { candidate, sender } = data;
    const peerConnection = peerConnections.current.get(sender);
    
    if (peerConnection && candidate) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
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

        videoTrack.onended = () => {
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
    remoteVideosRef.current.clear();
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
    if (totalVideos === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalVideos <= 4) return 'grid-cols-1 md:grid-cols-2';
    if (totalVideos <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  const remoteParticipants = participants.filter(participant => participant.socketId !== socket?.id);

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className={`flex-1 grid ${getGridClass()} gap-4 p-4 overflow-hidden`}>
        <div className="video-container aspect-video relative">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover rounded-xl"
          />
          <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-semibold ${
            isDark ? 'bg-black/50 text-white' : 'bg-white/90 text-gray-800'
          }`}>
            {userName} (You)
            {!videoEnabled && ' • Camera Off'}
            {isScreenSharing && ' • Sharing'}
          </div>
          
          {!videoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-xl">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  isDark ? 'bg-gray-700' : 'bg-gray-300'
                }`}>
                  <VideoOff size={24} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                </div>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  Camera is off
                </p>
              </div>
            </div>
          )}
        </div>

        {remoteParticipants.map(participant => (
          <div key={participant.socketId} className="video-container aspect-video relative">
            <video
              ref={(el) => setRemoteVideoRef(participant.socketId, el)}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-xl"
            />
            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-semibold ${
              isDark ? 'bg-black/50 text-white' : 'bg-white/90 text-gray-800'
            }`}>
              {participant.userName}
            </div>
          </div>
        ))}
      </div>

      <div className={`rounded-xl p-4 mx-auto w-full max-w-2xl ${
        isDark ? 'bg-gray-800' : 'bg-white shadow-lg'
      }`}>
        <div className="flex justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-all duration-200 ${
              audioEnabled 
                ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-all duration-200 ${
              videoEnabled 
                ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-all duration-200 ${
              isScreenSharing 
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white' 
                : 'bg-gray-600 hover:bg-gray-500 text-white'
            }`}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>
        </div>
      </div>

      <div className={`text-center text-sm ${
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