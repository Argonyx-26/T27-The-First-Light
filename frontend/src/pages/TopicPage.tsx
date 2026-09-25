import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Zap, Atom, ArrowRight, Loader2, PlusCircle } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface TopicOption {
  subject: string;
  topic: string;
  description: string;
  icon: React.ElementType;
  badgeColor: "secondary" | "outline";
  conceptCount: number;
}

export const TopicPage: React.FC = () => {
  const navigate = useNavigate();
  const { startSession } = useSession();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const topics: TopicOption[] = [
    {
      subject: "Physics",
      topic: "Newton's Laws",
      description: "Force, constant motion, inertia, and action-reaction interaction pairs.",
      icon: Compass,
      badgeColor: "secondary",
      conceptCount: 3,
    },
    {
      subject: "Physics",
      topic: "Kinematics",
      description: "One-dimensional motion, instantaneous velocity vs acceleration, and direction.",
      icon: Zap,
      badgeColor: "secondary",
      conceptCount: 2,
    },
    {
      subject: "Chemistry",
      topic: "Chemical Bonding",
      description: "Chemical energetics, bond formation vs dissociation, and electron sharing.",
      icon: Atom,
      badgeColor: "secondary",
      conceptCount: 2,
    },
  ];

  const handleStart = async (topicName: string) => {
    setSelectedTopic(topicName);
    setStarting(true);
    try {
      await startSession(topicName);
      navigate("/quiz");
    } catch (err) {
      console.error("Failed to start session:", err);
      setStarting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-2">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Choose a topic to begin
        </h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          Select a foundational domain. The adaptive engine will assess your mental models and pinpoint any misconceptions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {topics.map((t, idx) => {
          const Icon = t.icon;
          const isSelected = selectedTopic === t.topic;

          return (
            <motion.div
              key={t.topic}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Card
                className={`border transition-all cursor-pointer hover:border-primary/50 hover:shadow-subtle ${
                  isSelected ? "border-primary ring-2 ring-primary/20 bg-indigo-50/20" : "border-border bg-white"
                }`}
                onClick={() => !starting && handleStart(t.topic)}
              >
                <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-slate-100 text-slate-800 flex-shrink-0 mt-0.5 sm:mt-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-[11px] font-medium uppercase tracking-wider">
                          {t.subject}
                        </Badge>
                        <span className="text-xs text-muted-foreground">• {t.conceptCount} diagnostic models</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {t.topic}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-snug">
                        {t.description}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={starting}
                    className="w-full sm:w-auto flex-shrink-0 font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStart(t.topic);
                    }}
                  >
                    {starting && isSelected ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Initializing...</span>
                      </>
                    ) : (
                      <>
                        <span>Start</span>
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Extensibility indicator */}
      <div className="p-4 rounded-xl border border-dashed border-border bg-slate-50/50 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-2">
          <PlusCircle className="w-4 h-4 text-slate-400" />
          <span>Extensible architecture: More topics and competitive exam modules can be added.</span>
        </div>
        <span className="font-semibold text-slate-700">JEE / NEET Ready</span>
      </div>
    </div>
  );
};
