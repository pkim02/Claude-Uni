import { useState } from "react";
import { Home } from "./pages/Home";
import { Courses } from "./pages/Courses";
import { CourseDetail } from "./pages/CourseDetail";
import { Learn } from "./pages/Learn";
import { Quiz } from "./pages/Quiz";
import { Plan } from "./pages/Plan";
import { Assignments } from "./pages/Assignments";
import { Settings } from "./pages/Settings";
import { Sidebar } from "./components/Sidebar";

export type Page =
  | { name: "home" }
  | { name: "courses" }
  | { name: "course"; courseId: string }
  | { name: "learn"; courseId: string }
  | { name: "quiz"; courseId: string }
  | { name: "plan"; courseId: string }
  | { name: "assignments" }
  | { name: "settings" };

export default function App() {
  const [page, setPage] = useState<Page>({ name: "home" });

  function navigate(newPage: Page) {
    setPage(newPage);
  }

  function renderPage() {
    switch (page.name) {
      case "home":
        return <Home navigate={navigate} />;
      case "courses":
        return <Courses navigate={navigate} />;
      case "course":
        return <CourseDetail courseId={page.courseId} navigate={navigate} />;
      case "learn":
        return <Learn courseId={page.courseId} navigate={navigate} />;
      case "quiz":
        return <Quiz courseId={page.courseId} navigate={navigate} />;
      case "plan":
        return <Plan courseId={page.courseId} navigate={navigate} />;
      case "assignments":
        return <Assignments navigate={navigate} />;
      case "settings":
        return <Settings navigate={navigate} />;
    }
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <Sidebar currentPage={page.name} navigate={navigate} />
      <main className="flex-1 overflow-y-auto">{renderPage()}</main>
    </div>
  );
}
