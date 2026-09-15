import type { ReactNode } from "react";
import { Link, Route, Routes } from "react-router-dom";
import ExamSetup from "./pages/ExamSetup";
import Home from "./pages/Home";
import Results from "./pages/Results";
import Review from "./pages/Review";
import Session from "./pages/Session";

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="wordmark" to="/">
          ExamHelper
          <span>Practice</span>
        </Link>
      </header>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/exam/:id" element={<ExamSetup />} />
        <Route path="/exam/:id/session" element={<Session />} />
        <Route path="/exam/:id/results" element={<Results />} />
        <Route path="/exam/:id/review" element={<Review />} />
        <Route path="*" element={<p className="error">Page not found.</p>} />
      </Routes>
    </Layout>
  );
}
