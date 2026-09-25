import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Compass, ShieldCheck, Layers, GitPullRequest } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DiagnosticJourney } from "@/components/ui/DiagnosticJourney";

export const StartPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background pt-12 pb-24">
      <DiagnosticJourney />
    </div>
  );
};
