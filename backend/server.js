const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/skynet', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));

// Socket.IO Logic
const users = {}; // Simpan user yang online

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Saat user login
  socket.on('register-user', (userId) => {
    users[userId] = socket.id;
    socket.userId = userId;
    io.emit('user-online', userId); // Beri tahu semua user
    console.log(`User ${userId} is online`);
  });

  // Kirim pesan
  socket.on('send-message', async (data) => {
    const { sender, receiver, content, chatType } = data;

    // Simpan ke database (buat model nanti)
    const Message = require('./models/Message');
    const newMessage = new Message({ sender, receiver, content, chatType });
    await newMessage.save();

    // Kirim ke penerima jika online
    if (chatType === 'private' && users[receiver]) {
      io.to(users[receiver]).emit('receive-message', newMessage);
    } else if (chatType === 'group') {
      io.emit('receive-message', newMessage); // Broadcast ke semua
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userId = socket.userId;
    if (userId) {
      delete users[userId];
      io.emit('user-offline', userId);
      console.log(`User ${userId} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
