const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const FRONTEND_URLS = "https://videoconnect-ikarus-3d.onrender.com";

const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", 
      FRONTEND_URLS,
      "https://videoconnect-ikarus-3d.onrender.com",
      "https://*.onrender.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
app.options('*', cors());

app.use(cors({
  origin: [
    "http://localhost:3000", 
      FRONTEND_URLS,
      "https://videoconnect-ikarus-3d.onrender.com",
      "https://*.onrender.com"
    ],
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const activeMeetings = new Map();
const users = new Map();
const pendingUsers = new Map();

app.get('/', (req, res) => {
  res.json({ message: 'Video Call API' });
});

app.post('/api/meetings/create', (req, res) => {
  const meetingId = uuidv4();
  const meeting = {
    id: meetingId,
    participants: new Map(),
    createdAt: new Date(),
    chat: [],
    adminSocketId: null,
    settings: {
      requireApproval: true,
      locked: false
    },
    pendingJoins: new Map()
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
    
    if (meeting.participants.size === 0 && userData.isHost) {
      meeting.adminSocketId = socket.id;
      console.log(`Admin set: ${userData.name} (${socket.id})`);
    }

    if (meeting.settings.requireApproval && !userData.isHost && meeting.adminSocketId) {
      const pendingUser = {
        ...userData,
        socketId: socket.id,
        meetingId,
        requestTime: new Date()
      };
      
      meeting.pendingJoins.set(socket.id, pendingUser);
      
      socket.to(meeting.adminSocketId).emit('user-waiting-approval', {
        user: userData,
        socketId: socket.id
      });
      
      socket.emit('waiting-for-approval', {
        message: 'Waiting for host approval to join the meeting'
      });
      
      console.log(`User ${userData.name} is waiting for approval in meeting ${meetingId}`);
      return;
    }

    completeUserJoin(socket, meetingId, userData);
  });

  socket.on('approve-user', (data) => {
    const { targetSocketId, approved } = data;
    const user = users.get(socket.id);
    
    if (!user || !user.isHost) {
      socket.emit('error', { message: 'Only host can approve users' });
      return;
    }

    const meeting = activeMeetings.get(user.meetingId);
    if (!meeting || meeting.adminSocketId !== socket.id) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    const pendingUser = meeting.pendingJoins.get(targetSocketId);
    if (!pendingUser) {
      socket.emit('error', { message: 'User not found in pending list' });
      return;
    }

    if (approved) {
      completeUserJoin(io.sockets.sockets.get(targetSocketId), user.meetingId, pendingUser);
      meeting.pendingJoins.delete(targetSocketId);
      
      socket.emit('user-approved', {
        socketId: targetSocketId,
        userName: pendingUser.name
      });
      
      console.log(`User ${pendingUser.name} approved by admin`);
    } else {
      meeting.pendingJoins.delete(targetSocketId);
      io.to(targetSocketId).emit('join-declined', {
        message: 'Host declined your join request'
      });
      
      socket.emit('user-declined', {
        socketId: targetSocketId,
        userName: pendingUser.name
      });
      
      console.log(`User ${pendingUser.name} declined by admin`);
    }
  });

  socket.on('admin-toggle-audio', (data) => {
    const { targetSocketId, enabled } = data;
    const adminUser = users.get(socket.id);
    
    if (!adminUser || !adminUser.isHost) {
      socket.emit('error', { message: 'Only host can control audio' });
      return;
    }

    const meeting = activeMeetings.get(adminUser.meetingId);
    if (!meeting || meeting.adminSocketId !== socket.id) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    io.to(targetSocketId).emit('force-toggle-audio', { enabled });
    
    socket.to(adminUser.meetingId).emit('user-audio-toggled', {
      userId: targetSocketId,
      audioEnabled: enabled,
      byAdmin: true,
      adminName: adminUser.name
    });

    console.log(`Admin ${adminUser.name} ${enabled ? 'unmuted' : 'muted'} user ${targetSocketId}`);
  });

  socket.on('admin-toggle-video', (data) => {
    const { targetSocketId, enabled } = data;
    const adminUser = users.get(socket.id);
    
    if (!adminUser || !adminUser.isHost) {
      socket.emit('error', { message: 'Only host can control video' });
      return;
    }

    const meeting = activeMeetings.get(adminUser.meetingId);
    if (!meeting || meeting.adminSocketId !== socket.id) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    io.to(targetSocketId).emit('force-toggle-video', { enabled });
    
    socket.to(adminUser.meetingId).emit('user-video-toggled', {
      userId: targetSocketId,
      videoEnabled: enabled,
      byAdmin: true,
      adminName: adminUser.name
    });

    console.log(`Admin ${adminUser.name} ${enabled ? 'enabled' : 'disabled'} video for user ${targetSocketId}`);
  });

  socket.on('kick-user', (data) => {
    const { targetSocketId } = data;
    const adminUser = users.get(socket.id);
    
    if (!adminUser || !adminUser.isHost) {
      socket.emit('error', { message: 'Only host can kick users' });
      return;
    }

    const meeting = activeMeetings.get(adminUser.meetingId);
    if (!meeting || meeting.adminSocketId !== socket.id) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    const targetUser = users.get(targetSocketId);
    if (!targetUser) {
      socket.emit('error', { message: 'User not found' });
      return;
    }

    io.to(targetSocketId).emit('kicked-from-meeting', {
      message: 'You have been removed from the meeting by the host'
    });

    removeUserFromMeeting(targetSocketId);
    
    io.to(adminUser.meetingId).emit('user-kicked', {
      userId: targetSocketId,
      userName: targetUser.name,
      byAdmin: adminUser.name
    });

    console.log(`User ${targetUser.name} kicked by admin ${adminUser.name}`);
  });

  socket.on('end-meeting-for-all', () => {
    const adminUser = users.get(socket.id);
    
    if (!adminUser || !adminUser.isHost) {
      socket.emit('error', { message: 'Only host can end meeting' });
      return;
    }

    const meeting = activeMeetings.get(adminUser.meetingId);
    if (!meeting || meeting.adminSocketId !== socket.id) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    io.to(adminUser.meetingId).emit('meeting-ended-by-host', {
      message: 'Meeting has been ended by the host'
    });

    meeting.participants.forEach((user, socketId) => {
      if (socketId !== socket.id) {
        removeUserFromMeeting(socketId);
      }
    });

    meeting.pendingJoins.clear();

    console.log(`Meeting ${adminUser.meetingId} ended by admin ${adminUser.name}`);
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
        if (meeting.adminSocketId === socket.id) {
          io.to(user.meetingId).emit('meeting-ended-by-host', {
            message: 'Meeting has been ended because the host left'
          });

          meeting.participants.forEach((user, socketId) => {
            if (socketId !== socket.id) {
              removeUserFromMeeting(socketId);
            }
          });

          meeting.pendingJoins.clear();
          
          activeMeetings.delete(user.meetingId);
          
          console.log(`Meeting ${user.meetingId} ended because admin left`);
        } else {
          removeUserFromMeeting(socket.id);
        }
      }
    }

    console.log('User disconnected:', socket.id);
  });

  function completeUserJoin(socket, meetingId, userData) {
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

    io.to(meetingId).emit('user-joined', {
      user: userData,
      participants: Array.from(meeting.participants.values())
    });

    socket.emit('meeting-joined', {
      participants: Array.from(meeting.participants.values()),
      chat: meeting.chat,
      isHost: userData.isHost || false
    });

    console.log(`User ${userData.name} joined meeting ${meetingId}`);
  }

  function removeUserFromMeeting(socketId) {
    const user = users.get(socketId);
    
    if (user) {
      const meeting = activeMeetings.get(user.meetingId);
      if (meeting) {
        meeting.participants.delete(socketId);
        meeting.pendingJoins.delete(socketId);
        
        io.to(user.meetingId).emit('user-left', {
          userId: socketId,
          participants: Array.from(meeting.participants.values())
        });

        if (meeting.participants.size === 0) {
          activeMeetings.delete(user.meetingId);
        }
      }
    }

    users.delete(socketId);
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});