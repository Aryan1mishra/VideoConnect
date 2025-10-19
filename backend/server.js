const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

const activeMeetings = new Map();
const users = new Map();

app.get('/', (req, res) => {
  res.json({ message: 'Video Call API' });
});

app.post('/api/meetings/create', (req, res) => {
  const meetingId = uuidv4();
  const meeting = {
    id: meetingId,
    participants: new Map(),
    createdAt: new Date(),
    chat: []
  };
  
  activeMeetings.set(meetingId, meeting);
  res.json({ meetingId, success: true });
});

app.get('/api/meetings/:meetingId', (req, res) => {
  const { meetingId } = req.params;
  const meeting = activeMeetings.get(meetingId);
  
  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found' });
  }
  
  res.json({ 
    meetingId, 
    participants: Array.from(meeting.participants.values()),
    exists: true 
  });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-meeting', (data) => {
    const { meetingId, userData } = data;
    
    if (!activeMeetings.has(meetingId)) {
      socket.emit('meeting-error', { message: 'Meeting not found' });
      return;
    }

    const meeting = activeMeetings.get(meetingId);
    
    users.set(socket.id, {
      ...userData,
      socketId: socket.id,
      meetingId
    });

    meeting.participants.set(socket.id, {
      ...userData,
      socketId: socket.id
    });

    socket.join(meetingId);
    socket.to(meetingId).emit('user-joined', {
      user: userData,
      participants: Array.from(meeting.participants.values())
    });

    socket.emit('meeting-joined', {
      participants: Array.from(meeting.participants.values()),
      chat: meeting.chat
    });

    console.log(`User ${userData.name} joined meeting ${meetingId}`);
  });

  socket.on('offer', (data) => {
    socket.to(data.target).emit('offer', {
      offer: data.offer,
      sender: socket.id
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.target).emit('answer', {
      answer: data.answer,
      sender: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  socket.on('send-message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const meeting = activeMeetings.get(user.meetingId);
    if (!meeting) return;

    const message = {
      id: uuidv4(),
      user: user.name,
      text: data.text,
      timestamp: new Date()
    };

    meeting.chat.push(message);

    io.to(user.meetingId).emit('new-message', message);
  });

  socket.on('toggle-audio', (data) => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.meetingId).emit('user-audio-toggled', {
        userId: socket.id,
        audioEnabled: data.enabled
      });
    }
  });

  socket.on('toggle-video', (data) => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.meetingId).emit('user-video-toggled', {
        userId: socket.id,
        videoEnabled: data.enabled
      });
    }
  });

  socket.on('start-screen-share', (data) => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.meetingId).emit('screen-share-started', {
        userId: socket.id,
        streamId: data.streamId
      });
    }
  });

  socket.on('stop-screen-share', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.meetingId).emit('screen-share-stopped', {
        userId: socket.id
      });
    }
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    
    if (user) {
      const meeting = activeMeetings.get(user.meetingId);
      if (meeting) {
        meeting.participants.delete(socket.id);
        
        
        socket.to(user.meetingId).emit('user-left', {
          userId: socket.id,
          participants: Array.from(meeting.participants.values())
        });

      
        if (meeting.participants.size === 0) {
          activeMeetings.delete(user.meetingId);
        }
      }
    }

    users.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});