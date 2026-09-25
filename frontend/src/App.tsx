import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "./context/SessionContext";
import { AppLayout } from "./components/layout/AppLayout";

// Student Pages
import { StartPage } from "./pages/StartPage";
import { TopicPage } from "./pages/TopicPage";
import { QuizPage } from "./pages/QuizPage";
import { DiagnosisPage } from "./pages/DiagnosisPage";
import { RemediationPage } from "./pages/RemediationPage";
import { VerificationPage } from "./pages/VerificationPage";
import { DashboardPage } from "./pages/DashboardPage";
import { KnowledgeMapPage } from "./pages/KnowledgeMapPage";
import { RevisionPage } from "./pages/RevisionPage";

// Exam Mode Pages
import { ExamSetupPage } from "./pages/exam/ExamSetupPage";
import { ExamSessionPage } from "./pages/exam/ExamSessionPage";
import { ExamReportPage } from "./pages/exam/ExamReportPage";

// Teacher Pages
import { TeacherDashboardPage } from "./pages/teacher/TeacherDashboardPage";
import { TeacherStudentsPage } from "./pages/teacher/TeacherStudentsPage";
import { StudentDetailPage } from "./pages/teacher/StudentDetailPage";
import { TeacherMisconceptionsPage } from "./pages/teacher/TeacherMisconceptionsPage";
import { TeacherAnalyticsPage } from "./pages/teacher/TeacherAnalyticsPage";
import { TeacherDemoPage } from "./pages/teacher/TeacherDemoPage";
import { TeacherMaterialsPage } from "./pages/teacher/TeacherMaterialsPage";
import { TeacherExamsPage } from "./pages/teacher/TeacherExamsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              {/* Student Routes */}
              <Route path="/" element={<StartPage />} />
              <Route path="/topic" element={<TopicPage />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/diagnosis" element={<DiagnosisPage />} />
              <Route path="/remediation" element={<RemediationPage />} />
              <Route path="/verification" element={<VerificationPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/knowledge-gaps" element={<KnowledgeMapPage />} />
              <Route path="/revision" element={<RevisionPage />} />

              {/* Exam Mode Routes */}
              <Route path="/exam" element={<ExamSetupPage />} />
              <Route path="/exam/:examId" element={<ExamSessionPage />} />
              <Route path="/exam/:examId/report" element={<ExamReportPage />} />

              {/* Teacher Routes */}
              <Route path="/teacher" element={<TeacherDashboardPage />} />
              <Route path="/teacher/class" element={<TeacherDashboardPage />} />
              <Route path="/teacher/students" element={<TeacherStudentsPage />} />
              <Route path="/teacher/students/:studentId" element={<StudentDetailPage />} />
              <Route path="/teacher/misconceptions" element={<TeacherMisconceptionsPage />} />
              <Route path="/teacher/exams" element={<TeacherExamsPage />} />
              <Route path="/teacher/materials" element={<TeacherMaterialsPage />} />
              <Route path="/teacher/analytics" element={<TeacherAnalyticsPage />} />
              <Route path="/teacher/demo" element={<TeacherDemoPage />} />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  );
};

export default App;
