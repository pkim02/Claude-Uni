import { useState, useEffect } from "react";
import { Save, RefreshCw, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useStorage, sendMessage } from "../hooks/useStorage";
import type { Settings as SettingsType, SyncState } from "@/shared/types";
import { DEFAULT_SETTINGS } from "@/shared/types";
import type { Page } from "../App";

interface SettingsProps {
  navigate: (page: Page) => void;
}

export function Settings({ navigate }: SettingsProps) {
  const [settings, setSettings] = useStorage<SettingsType>("settings", DEFAULT_SETTINGS);
  const [syncState] = useStorage<SyncState>("syncState", {
    lastSyncedAt: null,
    inProgress: false,
    phase: "idle",
    message: "",
    coursesFound: 0,
    assignmentsFound: 0,
    materialsFound: 0,
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.learnusCredentials) {
      setUsername(settings.learnusCredentials.username);
      setPassword(settings.learnusCredentials.password);
    }
  }, [settings.learnusCredentials]);

  const saveCredentials = async () => {
    await setSettings({
      ...settings,
      learnusCredentials: { username, password },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSync = () => {
    sendMessage({ type: "SYNC_LEARNUS", force: true });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* LearNUS Connection */}
      <section className="bg-[#111] border border-[#222] rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">LearNUS Connection</h2>
        <p className="text-sm text-gray-500">
          Connect your Yonsei LearNUS account to auto-import courses and assignments.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Student ID / Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., 2024123456"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 pr-10"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveCredentials}
              disabled={!username || !password}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors"
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Credentials
                </>
              )}
            </button>

            {settings.learnusCredentials && (
              <button
                onClick={handleSync}
                disabled={syncState.inProgress}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg hover:bg-[#222] disabled:opacity-50 transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${syncState.inProgress ? "animate-spin" : ""}`}
                />
                {syncState.inProgress ? "Syncing..." : "Sync Now"}
              </button>
            )}
          </div>

          {syncState.lastSyncedAt && (
            <p className="text-xs text-gray-600">
              Last synced: {new Date(syncState.lastSyncedAt).toLocaleString()}
              {" · "}
              {syncState.coursesFound} courses, {syncState.assignmentsFound} assignments
            </p>
          )}

          <p className="text-xs text-gray-700">
            Credentials are stored locally in your browser. They are used to navigate LearNUS
            via the extension's content script and are never sent to any external server.
          </p>
        </div>
      </section>

      {/* AI Provider */}
      <section className="bg-[#111] border border-[#222] rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">AI Provider</h2>
        <p className="text-sm text-gray-500">
          Claude University uses your existing AI subscription — no API key needed.
          Just keep a tab open.
        </p>

        <div className="flex gap-3">
          {(["claude", "chatgpt"] as const).map((provider) => (
            <button
              key={provider}
              onClick={() => setSettings({ ...settings, aiProvider: provider })}
              className={`flex-1 p-4 rounded-lg border text-center transition-colors ${
                settings.aiProvider === provider
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-[#222] bg-[#0a0a0a] hover:border-[#333]"
              }`}
            >
              <div className="font-medium text-sm">
                {provider === "claude" ? "Claude" : "ChatGPT"}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {provider === "claude" ? "claude.ai" : "chatgpt.com"}
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-700">
          Keep {settings.aiProvider === "claude" ? "claude.ai" : "chatgpt.com"} open in
          a tab. The extension will send prompts there automatically.
        </p>
      </section>

      {/* Sync Preferences */}
      <section className="bg-[#111] border border-[#222] rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Sync Preferences</h2>

        <label className="flex items-center justify-between">
          <div>
            <div className="text-sm">Auto-sync on open</div>
            <div className="text-xs text-gray-600">
              Sync with LearNUS each time you open a new tab
            </div>
          </div>
          <button
            onClick={() =>
              setSettings({ ...settings, autoSyncOnOpen: !settings.autoSyncOnOpen })
            }
            className={`w-10 h-6 rounded-full transition-colors ${
              settings.autoSyncOnOpen ? "bg-amber-500" : "bg-[#333]"
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full transform transition-transform mx-1 ${
                settings.autoSyncOnOpen ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      </section>

      {/* About */}
      <section className="text-center text-xs text-gray-700 space-y-1">
        <p>Claude University v0.1.0</p>
        <p>Don't let school get in the way of your education.</p>
      </section>
    </div>
  );
}
