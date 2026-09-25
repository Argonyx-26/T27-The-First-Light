import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Compass, ShieldCheck, Layers, GitPullRequest } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const StartPage: React.FC = () => {
  const features = [
    {
      icon: Compass,
      title: "Adaptive Assessment",
      desc: "Questions dynamically selected based on competing cognitive hypotheses.",
    },
    {
      icon: ShieldCheck,
      title: "Evidence-Based Diagnosis",
      desc: "Confidence-weighted evidence updates instead of single-guess assumptions.",
    },
    {
      icon: Layers,
      title: "Targeted Remediation",
      desc: "Unpacks the specific cognitive flaw rather than just reciting textbook definitions.",
    },
    {
      icon: GitPullRequest,
      title: "Verified Learning",
      desc: "Tests conceptual repair using a different-form question testing the same principle.",
    },
  ];

  return (
    <div className="space-y-12 py-4 sm:py-8 max-w-4xl mx-auto">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-5"
      >
        <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-200/80 px-3.5 py-1.5 rounded-full text-indigo-900 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Intelligent Root-Cause Learning</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight sm:leading-tight">
          Understand what you know. <br className="hidden sm:inline" />
          <span className="text-primary underline decoration-indigo-300 decoration-wavy decoration-2 underline-offset-8">
            Discover what you don&apos;t.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Misconception Mapper goes beyond right and wrong answers to identify the exact reasoning and cognitive fallacies behind your mistakes.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/topic" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto px-8 text-base bg-primary hover:bg-primary/90 text-white font-semibold shadow-md">
              <span>Start Diagnosis</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link to="/knowledge-gaps" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-slate-700">
              <span>Explore Knowledge Graph</span>
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Product Differentiator Highlight Banner */}
      <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 shadow-subtle p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 text-[11px]">
                Core Product Insight
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">The MM Difference</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 pt-1">
              &ldquo;Your wrong answer isn&apos;t the problem. Not knowing why it&apos;s wrong is.&rdquo;
            </h3>
            <p className="text-xs text-slate-600 max-w-xl">
              Two students can get the exact same question wrong with identical scores, but hold completely different misconceptions. MM identifies and repairs the specific root cause.
            </p>
          </div>
          <Link to="/topic" className="flex-shrink-0">
            <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200">
              Try It Live
            </Button>
          </Link>
        </div>
      </Card>

      {/* Feature Pillar Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <Card key={i} className="border border-border/70 hover:border-slate-300 transition-all bg-white shadow-xs">
              <CardContent className="p-5 flex items-start space-x-4">
                <div className="p-2.5 rounded-xl bg-slate-100 text-primary flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{f.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
