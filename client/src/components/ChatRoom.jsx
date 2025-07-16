import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { fetchMessages, fetchPrivateMessages, fetchRooms, createRoom } from "../services/api";

const SOCKET_URL = "http://localhost:5001";

const ChatRoom = ({ user }) => {
  const [rooms, setRooms] = useState([]); // List of available rooms
  const [currentRoom, setCurrentRoom] = useState(null); // Currently joined room
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [typingUser, setTypingUser] = useState(null);
  let typingTimeout = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]); // Users in current room
  const [selectedUser, setSelectedUser] = useState(null);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [newRoom, setNewRoom] = useState("");

  // Fetch available rooms on mount
  useEffect(() => {
    const loadRooms = async () => {
      const data = await fetchRooms();
      setRooms(data);
    };
    loadRooms();
  }, []);

  // Set up socket connection and all socket event handlers ONCE
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit("userOnline", user.username);

    // Online users
    socketRef.current.on("onlineUsers", (users) => setOnlineUsers(users));

    // Room history (main fix: register only once)
    const handleRoomHistory = (msgs) => setMessages(msgs);
    socketRef.current.on("roomHistory", handleRoomHistory);

    // New chat message
    socketRef.current.on("chatMessage", (msg) => {
      setMessages((prev) => {
        // Only add if the message is for the current room
        if (msg.room === currentRoom) {
          return [...prev, msg];
        }
        return prev;
      });
    });

    // Room users
    socketRef.current.on("roomUsers", ({ room, users }) => {
      if (room === currentRoom) setRoomUsers(users);
    });

    // Typing indicators
    socketRef.current.on("typing", (username) => {
      // Only show typing if you are in a private chat with the sender
      if (selectedUser && username === selectedUser) {
        setTypingUser(username);
      }
      // For rooms, show if not in private chat and not yourself
      else if (!selectedUser && username !== user.username) {
        setTypingUser(username);
      }
    });
    socketRef.current.on("stopTyping", (username) => {
      if (selectedUser && username === selectedUser) {
        setTypingUser(null);
      } else if (!selectedUser && username !== user.username) {
        setTypingUser(null);
      }
    });

    // Private messaging
    const privateMsgHandler = (msg) => {
      console.log('Private message received:', msg, 'selectedUser:', selectedUser);
      if (selectedUser && (msg.sender === selectedUser || msg.recipient === selectedUser)) {
        setPrivateMessages((prev) => [...prev, msg]);
      }
    };
    socketRef.current.on("privateMessage", privateMsgHandler);

    // Clean up all handlers and disconnect socket on unmount
    return () => {
      socketRef.current.off("onlineUsers");
      socketRef.current.off("roomHistory", handleRoomHistory);
      socketRef.current.off("chatMessage");
      socketRef.current.off("roomUsers");
      socketRef.current.off("typing");
      socketRef.current.off("stopTyping");
      socketRef.current.off("privateMessage", privateMsgHandler);
      socketRef.current.disconnect();
    };
  }, [user.username]);

  // Join default room on mount (first room)
  useEffect(() => {
    if (rooms.length > 0 && !currentRoom) {
      handleRoomSelect(rooms[0].name);
    }
  }, [rooms]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, privateMessages]);

  // Fetch private messages when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      fetchPrivateMessages(user.username, selectedUser).then((msgs) => {
        setPrivateMessages(msgs);
      });
    }
  }, [selectedUser, user.username]);

  // Room join/leave logic
  const handleRoomSelect = (roomName) => {
    if (currentRoom) {
      socketRef.current.emit("leaveRoom", { room: currentRoom });
    }
    setCurrentRoom(roomName);
    setMessages([]);
    setRoomUsers([]);
    setTypingUser(null);
    setSelectedUser(null);
    setPrivateMessages([]);
    socketRef.current.emit("joinRoom", { username: user.username, room: roomName });
  };

  // Typing logic (per room or private)
  const handleInputChange = (e) => {
    setText(e.target.value);
    if (selectedUser) {
      console.log('Emitting typing for private chat to:', selectedUser);
      socketRef.current.emit("typing", { username: user.username, recipient: selectedUser });
    } else if (currentRoom) {
      socketRef.current.emit("typing", { username: user.username, room: currentRoom });
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      if (selectedUser) {
        socketRef.current.emit("stopTyping", { username: user.username, recipient: selectedUser });
      } else if (currentRoom) {
        socketRef.current.emit("stopTyping", { username: user.username, room: currentRoom });
      }
    }, 1500);
  };

  // Send message (room or private)
  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (selectedUser) {
      const msg = {
        sender: user.username,
        recipient: selectedUser,
        text,
        timestamp: new Date().toISOString(),
      };
      socketRef.current.emit("privateMessage", msg);
      setPrivateMessages((prev) => [...prev, msg]); // Add message instantly
      setText("");
    } else if (currentRoom) {
      socketRef.current.emit("chatMessage", {
        sender: user.username,
        text,
        room: currentRoom,
      });
      setText("");
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    try {
      const room = await createRoom(newRoom);
      setRooms((prev) => [...prev, room]);
      setNewRoom("");
      handleRoomSelect(room.name);
    } catch (err) {
      alert(err.response?.data?.message || "Error creating room");
    }
  };

  return (
    <div className="flex max-w-4xl mx-auto mt-10 bg-purple-50 rounded-2xl shadow-lg border border-purple-200 h-[70vh]">
      {/* Improved Room list sidebar */}
      <div className="w-56 bg-purple-100 rounded-l-2xl p-4 flex flex-col border-r border-purple-200">
        {/* Create Room Form */}
        <form onSubmit={handleCreateRoom} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            placeholder="New room"
            className="flex-1 px-2 py-1 rounded border border-purple-300 text-sm"
          />
          <button
            type="submit"
            className="bg-purple-500 text-white px-2 py-1 rounded text-sm"
          >
            +
          </button>
        </form>
        <div className="font-bold text-purple-700 mb-2">Rooms</div>
        <div className="flex flex-col gap-1">
          {rooms.map((room) => (
            <button
              key={room._id}
              onClick={() => handleRoomSelect(room.name)}
              className={`px-3 py-2 rounded-lg text-left font-medium transition shadow-sm border border-purple-200 ${
                room.name === currentRoom
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                  : "bg-gradient-to-r from-purple-400 to-indigo-400 text-white"
              }`}
            >
              {room.name}
            </button>
          ))}
        </div>
      </div>
      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Online users list - OUTSIDE the scrollable area */}
        <div className="mb-2 flex items-center gap-2 px-4 pt-4">
          <span className="text-purple-700 font-semibold">Online:</span>
          <div className="flex flex-wrap gap-2">
            {onlineUsers
              .filter((u) => u !== user.username)
              .map((u) => (
                <button
                  key={u}
                  onClick={() => {
                    setSelectedUser(u);
                    setPrivateMessages([]);
                  }}
                  className={`px-3 py-1 rounded-full text-sm font-medium shadow transition ${
                    selectedUser === u
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                      : "bg-gradient-to-r from-purple-400 to-indigo-400 text-white"
                  }`}
                >
                  {u}
                </button>
              ))}
          </div>
        </div>
        {/* Room users */}
        {!selectedUser && (
          <div className="px-4 pb-2 text-purple-600 text-xs">
            <span className="font-semibold">Users in this room:</span> {roomUsers.join(", ")}
          </div>
        )}
        {selectedUser && (
          <div className="px-4 pb-2 text-indigo-600 font-bold">
            Private chat with {selectedUser}
            <button
              className="ml-4 text-xs text-purple-500 underline"
              onClick={() => {
                setSelectedUser(null);
                setPrivateMessages([]);
              }}
            >
              Back to room chat
            </button>
          </div>
        )}
        {/* Scrollable messages area */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedUser ? (
            privateMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-2 flex ${msg.sender === user.username ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg shadow ${
                    msg.sender === user.username
                      ? "bg-gradient-to-r from-purple-400 to-indigo-400 text-white"
                      : "bg-purple-100 text-purple-800 border border-purple-200"
                  }`}
                  style={{ minWidth: "80px" }}
                >
                  <span className="font-semibold">
                    {msg.sender === user.username ? "me" : msg.sender}
                  </span>
                  <span className="text-xs text-gray-300 ml-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="ml-2">{msg.text}</div>
                </div>
              </div>
            ))
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-2 flex ${msg.sender === user.username ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg shadow ${
                    msg.sender === user.username
                      ? "bg-gradient-to-r from-purple-400 to-indigo-400 text-white"
                      : "bg-purple-100 text-purple-800 border border-purple-200"
                  }`}
                  style={{ minWidth: "80px" }}
                >
                  <span className="font-semibold">
                    {msg.sender === user.username ? "me" : msg.sender}
                  </span>
                  <span className="text-xs text-gray-300 ml-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="ml-2">{msg.text}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Typing indicator for both room and private chat */}
        {typingUser && (
          <div className="mb-2 text-purple-500 font-medium animate-pulse px-4">
            {typingUser} is typing...
          </div>
        )}
        <form onSubmit={handleSend} className="flex p-4 border-t border-purple-200 bg-purple-100 rounded-b-2xl">
          <input
            type="text"
            className="flex-1 px-4 py-2 rounded-l-lg border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder={selectedUser ? `Message @${selectedUser}` : currentRoom ? `Message #${currentRoom}` : "Type your message..."}
            value={text}
            onChange={handleInputChange}
            disabled={!currentRoom && !selectedUser}
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-2 rounded-r-lg font-semibold hover:from-purple-600 hover:to-indigo-600 transition"
            disabled={!currentRoom && !selectedUser}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;
