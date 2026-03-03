import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../lib/api";

type SaveState = "idle" | "saving" | "saved" | "error";

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [guidelines, setGuidelines] = useState("");
  const [savedGuidelines, setSavedGuidelines] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    apiFetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const val = data.brand_guidelines ?? "";
        setGuidelines(val);
        setSavedGuidelines(val);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = guidelines !== savedGuidelines;

  const handleSave = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ brand_guidelines: guidelines }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const val = data.brand_guidelines ?? "";
      setSavedGuidelines(val);
      setGuidelines(val);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [guidelines]);

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <span className="settings-panel-title">Brand Guidelines</span>
        <button className="settings-close-btn" onClick={onClose}>
          &times;
        </button>
      </div>
      <p className="settings-description">
        Rules the AI follows when generating posts. These supplement your voice
        profile.
      </p>
      {loading ? (
        <div className="settings-skeleton" />
      ) : (
        <textarea
          className="settings-textarea"
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          rows={6}
          placeholder={'e.g. Always say "Acme Corp" not "Acme"\nNever mention internal project names'}
        />
      )}
      <div className="settings-footer">
        <span className="settings-status">
          {saveState === "saved" && "Saved!"}
          {saveState === "error" && "Failed to save"}
        </span>
        <button
          className="btn-primary settings-save-btn"
          onClick={handleSave}
          disabled={!hasChanges || saveState === "saving"}
        >
          {saveState === "saving" ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
