import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Profile({ session }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [baseResumeText, setBaseResumeText] = useState("");
  const [roles, setRoles] = useState("");
  const [locations, setLocations] = useState("");
  const [reminderOptIn, setReminderOptIn] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else if (data) {
          setName(data.name || "");
          setHeadline(data.headline || "");
          setSkillsText((data.skills || []).join(", "));
          setBaseResumeText(data.base_resume_text || "");
          setRoles((data.target_roles || []).join(", "));
          setLocations((data.target_locations || []).join(", "));
          setReminderOptIn(data.reminder_opt_in !== false);
        }
        setLoading(false);
      });
  }, [session.user.id]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);

    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        headline,
        skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean),
        base_resume_text: baseResumeText,
        target_roles: roles.split(",").map((s) => s.trim()).filter(Boolean),
        target_locations: locations.split(",").map((s) => s.trim()).filter(Boolean),
        reminder_opt_in: reminderOptIn,
      })
      .eq("id", session.user.id);

    if (error) setError(error.message);
    else setSaved(true);
  }

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div className="card">
      <h2>Your profile</h2>
      <p style={{ color: "#666", fontSize: 13 }}>
        This information powers your daily 12am reminder and is used as the base resume that gets
        auto-tailored to each job you apply to.
      </p>
      {error && <div className="error">{error}</div>}
      {saved && <div style={{ color: "#16a34a", fontSize: 13, marginBottom: 8 }}>Saved.</div>}

      <form onSubmit={handleSave}>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label>Headline (e.g. "Frontend Engineer, 4 yrs experience")</label>
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} />

        <label>Skills (comma-separated)</label>
        <input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="React, Node.js, SQL" />

        <label>Target roles (comma-separated)</label>
        <input value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="Frontend Engineer, Full Stack Developer" />

        <label>Preferred locations (comma-separated)</label>
        <input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Hyderabad, Remote" />

        <label>Base resume (plain text) — this gets tailored per job</label>
        <textarea
          value={baseResumeText}
          onChange={(e) => setBaseResumeText(e.target.value)}
          placeholder="Paste your resume text here..."
          style={{ minHeight: 220 }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            style={{ width: "auto", margin: 0 }}
            checked={reminderOptIn}
            onChange={(e) => setReminderOptIn(e.target.checked)}
          />
          Send me a daily reminder at 12am based on my profile
        </label>

        <button type="submit">Save profile</button>
      </form>
    </div>
  );
}
