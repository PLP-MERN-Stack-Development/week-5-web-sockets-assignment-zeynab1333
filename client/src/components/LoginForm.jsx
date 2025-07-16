import React, { useState } from "react";
import { loginUser } from "../services/api";

const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    try {
      const user = await loginUser(username);
      onLogin(user); // Pass user info to parent
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-sm mx-auto mt-32 p-8 bg-purple-50 rounded-2xl shadow-lg flex flex-col gap-5 border border-purple-200"
      style={{ fontFamily: "inherit" }}
    >
      <h2 className="text-2xl font-bold mb-4 text-center text-purple-700">
        Welcome
      </h2>
      <input
        type="text"
        placeholder="Enter your username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="border border-purple-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white placeholder-purple-300 text-purple-700"
      />
      <button
        type="submit"
        className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2 rounded-lg font-semibold shadow hover:from-purple-600 hover:to-indigo-600 transition"
      >
        Login
      </button>
      {error && <p className="text-purple-600 text-center font-medium">{error}</p>}
    </form>
  );
};

export default LoginForm;
