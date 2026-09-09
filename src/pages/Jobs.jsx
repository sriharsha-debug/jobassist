import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function buildPrompt({ baseResumeText, jobDescription, jobTitle, company }) {
  return `You are a resume-tailoring assistant. You will be given a candidate's base resume and a target job description.

Rewrite the resume so it is tailored to this specific job, following these rules:
1. Do NOT invent new jobs, skills, degrees, or achievements that are not present in the base resume.
2. You MAY reorder sections/bullets, rephrase wording, and emphasize experience that matches the job description's requirements.
3. Mirror relevant keywords and terminology from the job description where the candidate genuinely has that experience.
4. Keep it truthful, concise, and in standard resume formatting (plain text with clear section headers).
5. Output ONLY the tailored resume text - no preamble, no explanation, no markdown code fences.

Target role: ${jobTitle} at ${company}

Job description:
"""
${jobDescription}
"""

Candidate's base resume:
"""
${baseResumeText}
"""`;
}

export default function Jobs({ session }) {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({});
  const [pasteOpenFor, setPasteOpenFor] = useState(null);
  const [pasteText, setPasteText] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadJobs(q) {
    let request = supabase.from("jobs").select("*").order("posted_at", { ascending: false });
    if (q) request = request.ilike("title", `%${q}%`);
    const { data, error } = await request;
    if (error) setError(error.message);
    else setJobs(data);
  }

  useEffect(() => {
    loadJobs();
    if (session) {
      supabase
        .from("applications")
        .select("*")
        .eq("user_id", session.user.id)
        .then(({ data }) => {
          if (data) {
            const byJob = {};
            data.forEach((a) => (byJob[a.job_id] = a));
            setResults(byJob);
          }
        });
    }
  }, [session]);

  async function handleOpenTailor(job) {
    if (!session) {
      setError("Please log in and fill out your profile (with a base resume) first.");
      return;
    }
    setError("");

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("base_resume_text")
      .eq("id", session.user.id)
      .single();

    if (profileErr || !profile?.base_resume_text) {
      setError("Save a base resume in your Profile page first.");
      return;
    }

    const prompt = buildPrompt({
      baseResumeText: profile.base_resume_text,
      jobDescription: job.description,
      jobTitle: job.title,
      company: job.company,
    });

    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // clipboard may fail in some browsers/contexts; user can still select text manually
    }

    window.open("https://claude.ai/new", "_blank", "noopener,noreferrer");
    setPasteOpenFor(job.id);
    setPasteText("");
  }

  async function handleSavePasted(job) {
    if (!pasteText.trim()) {
      setError("Paste the AI's tailored resume text before saving.");
      return;
    }
    setSaving(true);
    setError("");

    const { data, error } = await supabase
      .from("applications")
      .upsert(
        {
          user_id: session.user.id,
          job_id: job.id,
          tailored_resume_text: pasteText,
          status: "draft",
        },
        { onConflict: "user_id,job_id" }
      )
      .select()
      .single();

    setSaving(false);
    if (error) setError(error.message);
    else {
      setResults((prev) => ({ ...prev, [job.id]: data }));
      setPasteOpenFor(null);
      setPasteText("");
    }
  }

  async function handleApply(application) {
    const { data, error } = await supabase
      .from("applications")
      .update({ status: "applied", applied_at: new Date().toISOString() })
      .eq("id", application.id)
      .select()
      .single();
    if (error) setError(error.message);
    else {
      setResults((prev) => ({ ...prev, [data.job_id]: data }));
      alert("Marked as applied!");
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Find jobs</h2>
        {error && <div className="error">{error}</div>}
        <input
          placeholder="Search job title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadJobs(query)}
        />
        <button onClick={() => loadJobs(query)}>Search</button>
      </div>

      {jobs.length === 0 && (
        <div className="card">
          No jobs yet. Run the seed rows in <code>supabase/schema.sql</code>, or add some from the
          Supabase Table Editor.
        </div>
      )}

      {jobs.map((job) => {
        const application = results[job.id];
        return (
          <div className="card" key={job.id}>
            <div className="job-title">{job.title}</div>
            <div className="job-meta">
              {job.company} · {job.location || "Location N/A"} {job.remote ? "· Remote" : ""}
            </div>
            <p>{job.description.slice(0, 220)}{job.description.length > 220 ? "..." : ""}</p>

            <button onClick={() => handleOpenTailor(job)}>
              Tailor resume with Claude.ai
            </button>

            {pasteOpenFor === job.id && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 13, color: "#666" }}>
                  A prompt was copied to your clipboard and Claude.ai opened in a new tab. Paste the
                  prompt there (Ctrl+V), copy Claude's reply, then paste it below and save.
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste Claude's tailored resume here..."
                  style={{ minHeight: 180 }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => handleSavePasted(job)} disabled={saving}>
                    {saving ? "Saving..." : "Save tailored resume"}
                  </button>
                  <button onClick={() => setPasteOpenFor(null)} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {application && pasteOpenFor !== job.id && (
              <div style={{ marginTop: 16 }}>
                <h4>Tailored resume for this job</h4>
                <pre className="resume">{application.tailored_resume_text}</pre>
                <div style={{ display: "flex", gap: 8 }}>
                  {application.status !== "applied" ? (
                    <button onClick={() => handleApply(application)}>Mark as applied</button>
                  ) : (
                    <span style={{ color: "#16a34a", fontWeight: 600 }}>Applied ✓</span>
                  )}
                  <button onClick={() => handleOpenTailor(job)}>Re-tailor</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
