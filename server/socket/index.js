const Message = require('../models/Message');
const User = require('../models/User');
const Room = require('../models/Room');

let onlineUsers = new Set();
let userSocketMap = {}; // username -> socket.id
let socketRoomMap = {}; // socket.id -> room name

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        let currentUsername = null;

        // --- Room join/leave logic ---
        socket.on('joinRoom', async ({ username, room }) => {
            if (socketRoomMap[socket.id]) {
                // Leave previous room
                socket.leave(socketRoomMap[socket.id]);
            }
            socket.join(room);
            socketRoomMap[socket.id] = room;
            currentUsername = username;
            onlineUsers.add(username);
            userSocketMap[username] = socket.id;

            // Update DB
            await User.findOneAndUpdate({ username }, { online: true });

            // Notify users in the room
            io.to(room).emit('roomUsers', {
                room,
                users: getUsersInRoom(io, room)
            });

            // Optionally, send room history
            const messages = await Message.find({ room }).sort({ createdAt: 1 }).lean();
            socket.emit('roomHistory', messages);
        });

        socket.on('leaveRoom', ({ room }) => {
            socket.leave(room);
            delete socketRoomMap[socket.id];
            // Optionally, notify users in the room
            io.to(room).emit('roomUsers', {
                room,
                users: getUsersInRoom(io, room)
            });
        });

        // --- Chat message to room ---
        socket.on('chatMessage', async (data) => {
            const { sender, text, room } = data;
            console.log('Received chatMessage:', data);
            try {
                const message = new Message({ sender, text, room });
                await message.save();
                console.log('Message saved:', message);
                io.to(room).emit('chatMessage', message);
            } catch (err) {
                console.error('Error saving message:', err);
            }
        });

        // --- Typing indicator logic (per room or private) ---
        socket.on('typing', ({ username, room, recipient }) => {
            if (room) {
                socket.to(room).emit('typing', username);
            } else if (recipient) {
                console.log('Private typing event from', username, 'to', recipient);
                const recipientSocketId = userSocketMap[recipient];
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('typing', username);
                }
            }
        });

        socket.on('stopTyping', ({ username, room, recipient }) => {
            if (room) {
                socket.to(room).emit('stopTyping', username);
            } else if (recipient) {
                const recipientSocketId = userSocketMap[recipient];
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('stopTyping', username);
                }
            }
        });

        // --- User online logic (for global online list) ---
        socket.on('userOnline', async (username) => {
            currentUsername = username;
            onlineUsers.add(username);
            userSocketMap[username] = socket.id;
            await User.findOneAndUpdate({ username }, { online: true });
            io.emit('onlineUsers', Array.from(onlineUsers));
        });

        // --- Private messaging ---
        socket.on('privateMessage', async ({ sender, recipient, text }) => {
            const message = new Message({ sender, recipient, text });
            await message.save();
            const recipientSocketId = userSocketMap[recipient];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('privateMessage', message);
            }
            socket.emit('privateMessage', message);
        });

        // --- Disconnect logic ---
        socket.on('disconnect', async () => {
            if (currentUsername) {
                onlineUsers.delete(currentUsername);
                delete userSocketMap[currentUsername];
                await User.findOneAndUpdate({ username: currentUsername }, { online: false });
                io.emit('onlineUsers', Array.from(onlineUsers));
            }
            // Remove from room
            const room = socketRoomMap[socket.id];
            if (room) {
                socket.leave(room);
                delete socketRoomMap[socket.id];
                io.to(room).emit('roomUsers', {
                    room,
                    users: getUsersInRoom(io, room)
                });
            }
            console.log('User disconnected:', socket.id);
        });
    });
};

// Helper to get users in a room
function getUsersInRoom(io, room) {
    const clients = io.sockets.adapter.rooms.get(room) || new Set();
    const users = [];
    for (let socketId of clients) {
        for (let [username, id] of Object.entries(userSocketMap)) {
            if (id === socketId) users.push(username);
        }
    }
    return users;
}
