import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Jobs({ session }) {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tailoring, setTailoring] = useState(null);
  const [results, setResults] = useState({});

  async function loadJobs(q) {
    let request = supabase.from("jobs").select("*").order("posted_at", { ascending: false });
    if (q) request = request.ilike("title", `%${q}%`);
    const { data, error } = await request;
    if (error) setError(error.message);
    else setJobs(data);
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function handleTailor(job) {
    if (!session) {
      setError("Please log in and fill out your profile (with a base resume) first.");
      return;
    }
    setError("");
    setTailoring(job.id);
    const { data, error } = await supabase.functions.invoke("tailor-resume", {
      body: { jobId: job.id },
    });
    if (error) setError(error.message);
    else setResults((prev) => ({ ...prev, [job.id]: data }));
    setTailoring(null);
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

            <button onClick={() => handleTailor(job)} disabled={tailoring === job.id}>
              {tailoring === job.id ? "Tailoring resume..." : "Auto-tailor my resume"}
            </button>

            {application && (
              <div style={{ marginTop: 16 }}>
                <h4>Tailored resume for this job</h4>
                <pre className="resume">{application.tailored_resume_text}</pre>
                {application.status !== "applied" ? (
                  <button onClick={() => handleApply(application)}>Mark as applied</button>
                ) : (
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>Applied ✓</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
