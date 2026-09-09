import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Applications({ session }) {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("applications")
      .select("*, job:jobs(*)")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setApplications(data);
      });
  }, [session.user.id]);

  return (
    <div className="card">
      <h2>My Applications</h2>
      {error && <div className="error">{error}</div>}
      {applications.length === 0 && <p>No applications yet.</p>}
      {applications.map((app) => (
        <div key={app.id} style={{ borderBottom: "1px solid #eee", padding: "12px 0" }}>
          <div className="job-title">{app.job?.title}</div>
          <div className="job-meta">
            {app.job?.company} · Status: <strong>{app.status}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}
