import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }, // read by the handle_new_user() trigger to seed profiles.name
    });
    if (error) return setError(error.message);

    if (!data.session) {
      // Email confirmation is enabled on the Supabase project
      setInfo("Check your email to confirm your account, then log in.");
      return;
    }
    navigate("/profile");
  }

  return (
    <div className="card">
      <h2>Create your account</h2>
      {error && <div className="error">{error}</div>}
      {info && <div style={{ color: "#16a34a", fontSize: 13, marginBottom: 8 }}>{info}</div>}
      <form onSubmit={handleSubmit}>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password (min 6 characters)</label>
        <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
