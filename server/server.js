const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courts', require('./routes/courts'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room for user
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  // Handle chat messages
  socket.on('sendMessage', (data) => {
    io.to(data.receiverId).emit('newMessage', data);
  });

  // Handle notifications
  socket.on('sendNotification', (data) => {
    io.to(data.userId).emit('newNotification', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/badminton-booking', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});