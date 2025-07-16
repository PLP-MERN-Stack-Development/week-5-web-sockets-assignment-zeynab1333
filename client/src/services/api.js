import axios from "axios";

const API_URL = "http://localhost:5001/api";

export const loginUser = async (username) => {
  const res = await axios.post(`${API_URL}/auth/login`, { username });
  return res.data.user;
};

export const logoutUser = async (username) => {
  const res = await axios.post(`${API_URL}/auth/logout`, { username });
  return res.data;
};

export const fetchMessages = async () => {
  const res = await axios.get(`${API_URL}/messages`);
  return res.data;
};

export const fetchPrivateMessages = async (user1, user2) => {
  const res = await axios.get(`${API_URL}/messages/private/${user1}/${user2}`);
  return res.data;
};

export const fetchRooms = async () => {
  const res = await axios.get(`${API_URL}/rooms`);
  return res.data;
};

export const createRoom = async (name) => {
  const res = await axios.post(`${API_URL}/rooms`, { name });
  return res.data;
};
