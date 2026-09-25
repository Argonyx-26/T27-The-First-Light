import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 font-sans text-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 md:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground bg-background">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Misconception Mapper (MM) • Team The First Light</span>
          <span>Argonyx &apos;26 Hackathon • Adaptive Diagnostic Learning</span>
        </div>
      </footer>
    </div>
  );
};
