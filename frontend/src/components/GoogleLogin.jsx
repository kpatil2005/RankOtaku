import React from "react";

const GoogleLogin = () => {
  const handleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = "profile email";
    const responseType = "code";

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&access_type=offline&prompt=consent`;

    window.location.href = url;
  };

  return (
    <button onClick={handleLogin} className="google-btn">
      Sign in with Google
    </button>
  );
};

export default GoogleLogin;
