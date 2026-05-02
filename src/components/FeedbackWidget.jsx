import React, { useState } from "react";

export default function FeedbackWidget({
  conversationId,
  messageIndex,
  userquery,
  llmresponse,
}) {
  const [vote, setVote] = useState(null);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // When a user clicks thumbs up or thumbs down,
  // save the vote and open the optional comment panel.
  const handleVote = (v) => {
    setVote(v);
    setOpen(true);
  };

  // Close the comment panel without submitting feedback.
  // Also clear the text box so old comments do not remain.
  const handleSkip = () => {
    setOpen(false);
    setComment("");
  };

  const submitFeedback = async () => {
    // Extra protection so nothing is submitted unless a vote exists.
    if (!vote) return;

    try {
      setSubmitting(true);

      // Include JWT token if the user is logged in.
      const token = localStorage.getItem("access_token");
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Current local backend endpoint.
      // Later, for deployment, this should come from an environment variable.
      const endpoint = `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/api/feedback`;

      // Send structured feedback data so each rating is tied
      // to the exact conversation and AI response.
      const body = {
        conversation_id: conversationId,
        message_index: messageIndex,
        vote,
        comment: comment.trim(),
        userquery,
        llmresponse,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Feedback failed: ${res.status}`);
      }

      // Reset widget state after successful submission.
      setOpen(false);
      setComment("");
      setVote(null);

      console.log("Feedback submitted successfully");
    } catch (e) {
      console.error("Feedback submission error:", e);
      alert("Could not submit feedback. Check console/network.");
    } finally {
      setSubmitting(false);
    }
  };

  // Do not show the widget until the conversation has been saved
  // and has a valid conversationId.
  if (!conversationId) return null;

  return (
    <div className="feedback-under">
      <span className="feedback-under-label">Was this helpful?</span>

      <div className="feedback-actions-row">
        <button
          type="button"
          className={`fb-btn ${vote === "up" ? "active" : ""}`}
          onClick={() => handleVote("up")}
          aria-label="Thumbs up"
        >
          👍
        </button>

        <button
          type="button"
          className={`fb-btn ${vote === "down" ? "active" : ""}`}
          onClick={() => handleVote("down")}
          aria-label="Thumbs down"
        >
          👎
        </button>
      </div>

      {open && (
        <div className="feedback-panel">
          <div className="feedback-title">
            {vote === "up"
              ? "🎉 Glad it helped! What did you like?"
              : "😔 Sorry about that. What could be improved?"}
          </div>

          <textarea
            className="feedback-textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts here..."
            maxLength={500}
            rows={3}
          />

          <div className="feedback-panel-actions">
            <button
              type="button"
              className="fb-action-btn fb-skip"
              onClick={handleSkip}
              disabled={submitting}
            >
              Skip
            </button>

            <button
              type="button"
              className="fb-action-btn fb-primary"
              onClick={submitFeedback}
              disabled={submitting || !vote}
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}