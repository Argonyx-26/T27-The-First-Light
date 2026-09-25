import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Compass,
  BookOpen,
  GitFork,
  BarChart3,
  ListFilter,
  Users,
  Grid,
  TrendingUp,
  Sparkles,
  GraduationCap,
  Layers,
  History,
  Library,
} from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  highlight?: boolean;
}

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { sessionId, topic } = useSession();

  const isTeacherMode = location.pathname.startsWith("/teacher");

  const studentLinks: NavItem[] = [
    { name: "Practice", path: "/topic", icon: BookOpen },
    { name: "Library", path: "/library", icon: Library },
    { name: "Exam Mode", path: "/exam", icon: GraduationCap },
    { name: "Knowledge Gaps", path: "/knowledge-gaps", icon: GitFork },
    { name: "Dashboard", path: "/dashboard", icon: BarChart3 },
    { name: "Revision", path: "/revision", icon: ListFilter },
    { name: "History", path: "/history", icon: History },
  ];

  const teacherLinks: NavItem[] = [
    { name: "Overview", path: "/teacher", icon: BarChart3 },
    { name: "Students", path: "/teacher/students", icon: Users },
    { name: "Misconceptions", path: "/teacher/misconceptions", icon: Grid },
    { name: "Exam Monitoring", path: "/teacher/exams", icon: GraduationCap },
    { name: "Materials & RAG", path: "/teacher/materials", icon: BookOpen },
    { name: "Analytics", path: "/teacher/analytics", icon: TrendingUp },
    { name: "Same-Score Demo", path: "/teacher/demo", icon: Layers, highlight: true },
  ];

  const currentLinks: NavItem[] = isTeacherMode ? teacherLinks : studentLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link to={isTeacherMode ? "/teacher" : "/"} className="flex items-center space-x-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-subtle">
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base tracking-tight text-slate-900 leading-tight">
                Misconception Mapper
              </span>
              {isTeacherMode && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                  Teacher
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {isTeacherMode ? "Cohort Learning Analytics" : "Diagnostic Learning"}
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          {currentLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.path === "/teacher"
                ? location.pathname === "/teacher" || location.pathname === "/teacher/class"
                : location.pathname === link.path ||
                  (link.path === "/topic" && location.pathname === "/quiz") ||
                  (link.path === "/exam" && location.pathname.startsWith("/exam")) ||
                  (link.path === "/teacher/students" && location.pathname.startsWith("/teacher/students/"));

            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-slate-900 font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  link.highlight && "text-indigo-600 hover:text-indigo-700 font-semibold"
                )}
              >
                <Icon className={cn("h-4 w-4", link.highlight && "text-indigo-600")} />
                <span>{link.name}</span>
                {link.highlight && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                    Key Demo
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Role Switcher & Status */}
        <div className="flex items-center space-x-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <Link
              to="/topic"
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all",
                !isTeacherMode
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Student
            </Link>
            <Link
              to="/teacher"
              className={cn(
                "flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all",
                isTeacherMode
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Teacher</span>
            </Link>
          </div>

          {!isTeacherMode && (
            sessionId ? (
              <div className="hidden sm:flex items-center space-x-2 bg-secondary/80 px-2.5 py-1 rounded-full border border-border">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-slate-700 max-w-[110px] truncate">
                  {topic || "Session"}
                </span>
              </div>
            ) : (
              <Link to="/topic" className="hidden sm:block">
                <Badge variant="outline" className="text-xs font-normal border-dashed text-muted-foreground hover:border-solid cursor-pointer">
                  <Sparkles className="h-3 w-3 mr-1 text-slate-400" />
                  Practice
                </Badge>
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
};
