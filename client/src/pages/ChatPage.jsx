import React from "react";
import ChatRoom from "../components/ChatRoom";

const ChatPage = ({ user, onLogout }) => (
  <div>
    <div className="flex justify-end max-w-lg mx-auto mt-6">
      <button
        onClick={onLogout}
        className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-1 rounded-lg font-semibold shadow hover:from-purple-600 hover:to-indigo-600 transition"
      >
        Logout
      </button>
    </div>
    <ChatRoom user={user} />
  </div>
);

export default ChatPage;
