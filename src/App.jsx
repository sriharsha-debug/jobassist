import React, { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Profile from "./pages/Profile.jsx";
import Jobs from "./pages/Jobs.jsx";
import Applications from "./pages/Applications.jsx";

function PrivateRoute({ session, children }) {
  return session ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  if (session === undefined) return <div className="container">Loading...</div>;

  return (
    <div>
      <nav>
        <Link to="/jobs">Jobs</Link>
        {session && <Link to="/profile">Profile</Link>}
        {session && <Link to="/applications">My Applications</Link>}
        <div style={{ marginLeft: "auto" }}>
          {session ? (
            <button className="secondary" onClick={handleLogout}>Logout</button>
          ) : (
            <>
              <Link to="/login">Login</Link>{"  "}
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>

      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/jobs" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/jobs" element={<Jobs session={session} />} />
          <Route
            path="/profile"
            element={
              <PrivateRoute session={session}>
                <Profile session={session} />
              </PrivateRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <PrivateRoute session={session}>
                <Applications session={session} />
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}
