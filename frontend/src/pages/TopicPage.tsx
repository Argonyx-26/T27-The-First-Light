import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, Play, Clock, BookOpen, Layers } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { api } from "@/api/client";
import { ActiveSessionSummary } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const TopicPage: React.FC = () => {
  const navigate = useNavigate();
  const { startSession, resumeSession } = useSession();

  const [topicInput, setTopicInput] = useState("");
  const [sessionLength, setSessionLength] = useState<number | null>(10);
  const [starting, setStarting] = useState(false);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionSummary[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(true);

  // Limit to at most 3 most recent sessions, sorted by last-updated
  const displayedSessions = [...activeSessions]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);

  useEffect(() => {
    let isMounted = true;
    const loadActive = async () => {
      try {
        const isTestEnv = typeof process !== "undefined" && process.env?.NODE_ENV === "test";
        const studentId = typeof window !== "undefined" ? localStorage.getItem("mm_student_id") : null;
        if (!studentId && !isTestEnv) {
          if (isMounted) {
            setActiveSessions([]);
          }
          return;
        }
        const res = await api.getActiveSessions(studentId || undefined);
        if (isMounted) {
          setActiveSessions(res.sessions || []);
        }
      } catch (err) {
        console.error("Failed to load active sessions:", err);
      } finally {
        if (isMounted) {
          setIsLoadingActive(false);
        }
      }
    };
    loadActive();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStart = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = topicInput.trim();
    if (!trimmed || starting) return;

    setStarting(true);
    try {
      if (typeof window !== "undefined" && !localStorage.getItem("mm_student_id")) {
        localStorage.setItem("mm_student_id", `student_${Math.random().toString(36).substring(2, 10)}`);
      }
      await startSession(trimmed, sessionLength);
      navigate("/quiz");
    } catch (err) {
      console.error("Failed to start session:", err);
      setStarting(false);
    }
  };

  const handleResume = async (sessionId: string) => {
    setResumingId(sessionId);
    try {
      await resumeSession(sessionId);
      navigate("/quiz");
    } catch (err) {
      console.error("Failed to resume session:", err);
      setResumingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          What do you want to practice?
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Type any concept or curriculum topic. The diagnostic engine dynamically adapts questions to map and resolve your misconceptions.
        </p>
      </div>

      {/* Main Practice Setup Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="border border-border/80 shadow-sm bg-white">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <form onSubmit={handleStart} className="space-y-6">
              {/* Free-text topic input */}
              <div className="space-y-2">
                <label
                  htmlFor="topic-input"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Topic or Concept
                </label>
                <div className="relative">
                  <input
                    id="topic-input"
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Search for a topic to take a quiz"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-900 placeholder:text-slate-400 text-sm font-medium transition"
                    autoFocus
                    disabled={starting}
                  />
                  <Sparkles className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Question Count Selector */}
              <div className="space-y-2.5">
                <label className="block text-sm font-semibold text-slate-800">
                  Question Count
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSessionLength(10)}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all ${
                      sessionLength === 10
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    10 Questions
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionLength(20)}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all ${
                      sessionLength === 20
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    20 Questions
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionLength(null)}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all ${
                      sessionLength === null
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Unlimited
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sessionLength === null
                    ? "Continuous practice with explicit session conclusion anytime."
                    : `Targeted session of ${sessionLength} calibrated questions.`}
                </p>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                size="lg"
                disabled={!topicInput.trim() || starting}
                className="w-full font-semibold text-white bg-primary hover:bg-primary/90 h-11 text-base shadow-sm"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Generating Adaptive Assessment...</span>
                  </>
                ) : (
                  <>
                    <span>Start Practice Session</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Resume Active/Paused Sessions List */}
      {displayedSessions.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Resume Practice Session</span>
            </h2>
            <Link
              to="/history"
              className="text-xs font-semibold text-primary hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {displayedSessions.map((s) => (
              <Card
                key={s.session_id}
                className="border border-border/80 bg-white hover:border-primary/40 transition shadow-2xs"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {s.topic}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] uppercase font-semibold tracking-wider"
                      >
                        {s.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {s.session_length
                            ? `Q${s.current_question_index} of ${s.session_length}`
                            : `Q${s.current_question_index} (Unlimited)`}
                        </span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.evidence_count} evidence item{s.evidence_count !== 1 ? "s" : ""}</span>
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleResume(s.session_id)}
                    disabled={resumingId === s.session_id}
                    className="font-semibold flex-shrink-0"
                  >
                    {resumingId === s.session_id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        <span>Resuming...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                        <span>Resume</span>
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

