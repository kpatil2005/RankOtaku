import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState("");
  const code = searchParams.get("code");
  const hasRun = useRef(false);

  useEffect(() => {
    if (code && !hasRun.current) {
      hasRun.current = true;
      axios
        .post(`${import.meta.env.VITE_API_URL}/api/auth/google`, { code })
        .then((res) => {
          const { token, user } = res.data;
          localStorage.setItem("token", token);
          setUser(user);
          navigate("/");
        })
        .catch((err) => {
          console.error("Google Auth Error:", err);
          setError("Authentication failed. Please try again.");
          setTimeout(() => navigate("/auth"), 3000);
        });
    }
  }, [code, navigate, setUser]);

  if (error) {
    return <div className="auth-page"><div className="error-message">{error}</div></div>;
  }

  return <div className="auth-page"><div>Authenticating with Google...</div></div>;
};

export default AuthCallback;
