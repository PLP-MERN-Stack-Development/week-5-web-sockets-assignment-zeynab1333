import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import { logoutUser } from "./services/api";

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = async () => {
    await logoutUser(user.username);
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            !user ? (
              <LoginPage onLogin={setUser} />
            ) : (
              <Navigate to="/chat" replace />
            )
          }
        />
        <Route
          path="/chat"
          element={
            user ? (
              <ChatPage user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
