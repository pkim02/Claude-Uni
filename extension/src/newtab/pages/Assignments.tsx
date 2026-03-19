import { useState, useCallback } from "react";
import {
  FileText,
  Clock,
  Loader,
  CheckCircle,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  GraduationCap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useStorage, useBackgroundMessages, sendMessage } from "../hooks/useStorage";
import type { Assignment } from "@/shared/types";
import type { Page } from "../App";

interface AssignmentsProps {
  navigate: (page: Page) => void;
}

export function Assignments({ navigate }: AssignmentsProps) {
  const [assignments, setAssignments] = useStorage<Assignment[]>("assignments", []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useBackgroundMessages(
    useCallback(() => {
      // Refresh on data updates — useStorage handles this automatically
    }, [])
  );

  const updateAssignment = async (id: string, updates: Partial<Assignment>) => {
    const updated = assignments.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    );
    await setAssignments(updated);
  };

  const markSubmitted = async (id: string) => {
    await updateAssignment(id, {
      status: "submitted",
      submittedAt: new Date().toISOString(),
    });
  };

  const markReviewed = async (id: string) => {
    await updateAssignment(id, {
      status: "reviewed",
      finalSolution: editText || assignments.find((a) => a.id === id)?.draftSolution || "",
    });
    setEditingDraft(null);
  };

  const requestDraft = (id: string) => {
    sendMessage({ type: "AUTO_DRAFT", assignmentId: id });
  };

  const formatDue = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);

    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    if (days < 0) return { text: `Overdue (${formatted})`, color: "text-red-400" };
    if (days === 0) return { text: "Due Today", color: "text-red-400" };
    if (days === 1) return { text: "Due Tomorrow", color: "text-amber-400" };
    if (days <= 3) return { text: `Due ${formatted}`, color: "text-amber-400" };
    return { text: `Due ${formatted}`, color: "text-gray-500" };
  };

  const statusConfig = {
    new: { icon: Clock, color: "text-gray-400", bg: "bg-gray-500/10", label: "New" },
    drafting: { icon: Loader, color: "text-blue-400", bg: "bg-blue-500/10", label: "Drafting..." },
    draft_ready: { icon: FileText, color: "text-amber-400", bg: "bg-amber-500/10", label: "Draft Ready" },
    reviewed: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", label: "Reviewed" },
    submitted: { icon: Check, color: "text-green-600", bg: "bg-green-500/5", label: "Submitted" },
  };

  // Group assignments
  const actionNeeded = assignments.filter((a) => a.status === "draft_ready" || a.status === "reviewed");
  const inProgress = assignments.filter((a) => a.status === "new" || a.status === "drafting");
  const completed = assignments.filter((a) => a.status === "submitted");

  const renderAssignment = (a: Assignment) => {
    const config = statusConfig[a.status];
    const Icon = config.icon;
    const due = formatDue(a.dueDate);
    const isExpanded = expandedId === a.id;
    const isEditing = editingDraft === a.id;

    return (
      <div
        key={a.id}
        className={`bg-[#111] border rounded-lg overflow-hidden transition-colors ${
          a.status === "draft_ready"
            ? "border-amber-500/20"
            : a.status === "reviewed"
            ? "border-green-500/20"
            : "border-[#222]"
        }`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#151515]"
          onClick={() => setExpandedId(isExpanded ? null : a.id)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Icon
              className={`w-5 h-5 shrink-0 ${config.color} ${
                a.status === "drafting" ? "animate-spin" : ""
              }`}
            />
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{a.title}</div>
              <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                <span>{a.courseName}</span>
                <span>·</span>
                <span className={`px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
                {due && (
                  <>
                    <span>·</span>
                    <span className={due.color}>{due.text}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {a.status === "draft_ready" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedId(a.id);
                  setEditingDraft(a.id);
                  setEditText(a.draftSolution);
                }}
                className="px-3 py-1.5 text-xs bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
              >
                Review Draft
              </button>
            )}
            {a.status === "reviewed" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markSubmitted(a.id);
                }}
                className="px-3 py-1.5 text-xs bg-green-600 text-white font-medium rounded-lg hover:bg-green-500 transition-colors"
              >
                Mark Submitted
              </button>
            )}
            {a.status === "new" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  requestDraft(a.id);
                }}
                className="px-3 py-1.5 text-xs bg-[#222] text-gray-300 font-medium rounded-lg hover:bg-[#2a2a2a] transition-colors"
              >
                Generate Draft
              </button>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-[#222] p-4 space-y-4">
            {/* Instructions */}
            {a.instructions && (
              <div>
                <div className="text-xs text-gray-600 mb-1 font-medium">Assignment Instructions</div>
                <div className="text-sm text-gray-400 bg-[#0a0a0a] rounded-lg p-3">
                  {a.instructions}
                </div>
              </div>
            )}

            {/* Draft Solution */}
            {(a.draftSolution || a.finalSolution) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-600 font-medium">
                    {a.finalSolution ? "Your Solution" : "Auto-Generated Draft"}
                  </div>
                  <div className="flex gap-2">
                    {a.learnusUrl && (
                      <a
                        href={a.learnusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
                      >
                        <ExternalLink className="w-3 h-3" /> Open in LearNUS
                      </a>
                    )}
                    <button
                      onClick={() =>
                        navigate({ name: "learn", courseId: a.courseId })
                      }
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
                    >
                      <GraduationCap className="w-3 h-3" /> Learn Topic
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-sm font-mono min-h-[300px] resize-y focus:outline-none focus:border-amber-500/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => markReviewed(a.id)}
                        className="px-4 py-2 text-sm bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                      >
                        Save & Mark Reviewed
                      </button>
                      <button
                        onClick={() => setEditingDraft(null)}
                        className="px-4 py-2 text-sm bg-[#222] text-gray-300 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="text-xs text-gray-600 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                      <strong className="text-amber-400">Make it yours:</strong> Edit the draft above to add your personal voice, swap examples,
                      and reference specific things from your lectures.
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0a0a0a] rounded-lg p-3 prose prose-invert prose-sm max-w-none max-h-96 overflow-y-auto">
                    <ReactMarkdown>
                      {a.finalSolution || a.draftSolution}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            {a.attachments.length > 0 && (
              <div>
                <div className="text-xs text-gray-600 mb-1 font-medium">Attachments</div>
                <div className="flex flex-wrap gap-2">
                  {a.attachments.map((name, i) => (
                    <span
                      key={i}
                      className="text-xs bg-[#1a1a1a] border border-[#222] px-2 py-1 rounded"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Assignments</h1>

      {assignments.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No assignments yet. Sync with LearNUS to import them.</p>
        </div>
      ) : (
        <>
          {/* Action Needed */}
          {actionNeeded.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-amber-400 mb-3 uppercase tracking-wider">
                Action Needed ({actionNeeded.length})
              </h2>
              <div className="space-y-2">{actionNeeded.map(renderAssignment)}</div>
            </section>
          )}

          {/* In Progress */}
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-blue-400 mb-3 uppercase tracking-wider">
                In Progress ({inProgress.length})
              </h2>
              <div className="space-y-2">{inProgress.map(renderAssignment)}</div>
            </section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wider">
                Submitted ({completed.length})
              </h2>
              <div className="space-y-2">{completed.map(renderAssignment)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
