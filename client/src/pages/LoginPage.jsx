import React from "react";
import LoginForm from "../components/LoginForm";

const LoginPage = ({ onLogin }) => (
  <div>
    <LoginForm onLogin={onLogin} />
  </div>
);

export default LoginPage;
