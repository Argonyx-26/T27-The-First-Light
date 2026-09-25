import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Compass, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AnswerFeedbackProps {
  isCorrect: boolean;
  onContinue: () => void;
}

export const AnswerFeedback: React.FC<AnswerFeedbackProps> = ({ isCorrect, onContinue }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full mt-6"
    >
      {isCorrect ? (
        <div className="p-5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5 sm:mt-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-emerald-950">
                Correct
              </h4>
              <p className="text-sm text-emerald-800/90 mt-0.5">
                Good. Let&apos;s see what you can tackle next.
              </p>
            </div>
          </div>
          <Button
            onClick={onContinue}
            className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <span>Next Question</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-indigo-200/80 bg-indigo-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 mt-0.5 sm:mt-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-indigo-950">
                That&apos;s okay. One wrong answer doesn&apos;t tell us why you got it wrong.
              </h4>
              <p className="text-sm text-indigo-800/90 mt-0.5">
                Let&apos;s ask one more question to understand your reasoning.
              </p>
            </div>
          </div>
          <Button
            onClick={onContinue}
            className="w-full sm:w-auto bg-indigo-700 hover:bg-indigo-800 text-white"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};
