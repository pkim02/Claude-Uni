import Link from "next/link";
import { BookOpen, Brain, Calendar, MessageSquare, Upload, Zap, ArrowRight, GraduationCap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)] z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-brand-500" />
            <span className="font-semibold text-lg">Claude University</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-[var(--foreground)] text-[var(--background)] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm mb-8 border border-brand-200">
            <Zap className="w-3.5 h-3.5" />
            AI tutoring that actually works
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-balance leading-[1.1]">
            당신의 대학교 수업,
            <br />
            <span className="text-brand-500">AI가 더 잘 가르칩니다.</span>
          </h1>

          <p className="text-xl md:text-2xl text-[var(--muted-foreground)] mb-4 text-balance">
            Your university courses — AI teaches them better.
          </p>

          <p className="text-lg text-[var(--muted-foreground)] mb-10 max-w-2xl mx-auto">
            Upload your syllabus. Get a tutor that knows your entire course.
            <br />
            Free. Instant. Better than office hours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-8 py-4 rounded-xl text-lg font-medium hover:opacity-90 transition-opacity"
            >
              Try it now — no credit card required
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            60 seconds from syllabus to your personal AI tutor
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-[var(--muted)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            How it works
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-16 text-lg">
            Three steps. Sixty seconds. Better than your professor&apos;s office hours.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              icon={<Upload className="w-6 h-6" />}
              title="Upload your syllabus"
              description="Drop in your syllabus PDF, lecture slides, past exams, or notes. We parse everything and build a complete course knowledge map."
            />
            <StepCard
              step={2}
              icon={<MessageSquare className="w-6 h-6" />}
              title="Start learning"
              description='Say "teach me week 3" and get an interactive lesson. Your AI tutor uses the Socratic method — it teaches you to think, not just memorize.'
            />
            <StepCard
              step={3}
              icon={<Brain className="w-6 h-6" />}
              title="Test & improve"
              description="Generate practice quizzes, get mock exams, and track your weak areas. Spaced repetition ensures you remember what you learn."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Everything you need to ace your courses
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<BookOpen className="w-5 h-5" />}
              title="Interactive AI Tutor"
              description="Not a chatbot — a teaching system. Uses Socratic method, adapts to your level, and references your actual course materials."
            />
            <FeatureCard
              icon={<Brain className="w-5 h-5" />}
              title="Smart Quiz Generation"
              description="Generates practice problems that match your course's exam style. Get detailed explanations for every answer."
            />
            <FeatureCard
              icon={<Calendar className="w-5 h-5" />}
              title="AI Study Planner"
              description="Enter your exam dates and get an optimized study schedule with spaced repetition. Cram mode for last-minute prep."
            />
            <FeatureCard
              icon={<MessageSquare className="w-5 h-5" />}
              title="한국어 + English"
              description="Fully bilingual. Write in Korean, get answers in Korean. Switch anytime. Perfect for Korean university students."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[var(--foreground)] text-[var(--background)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            AI tutoring is already better than university lectures.
          </h2>
          <p className="text-lg opacity-70 mb-10">
            Here&apos;s the proof — try it yourself. Upload your syllabus and see.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[var(--background)] text-[var(--foreground)] px-8 py-4 rounded-xl text-lg font-medium hover:opacity-90 transition-opacity"
          >
            Get started free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Claude University
          </div>
          <p>Built with Claude AI</p>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[var(--background)] rounded-2xl p-8 border border-[var(--border)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
          {step}
        </div>
        <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-[var(--muted-foreground)] leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl border border-[var(--border)] hover:border-brand-300 transition-colors">
      <div className="p-2 bg-brand-50 rounded-lg text-brand-600 w-fit mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-[var(--muted-foreground)] leading-relaxed">{description}</p>
    </div>
  );
}
