import { Download, ExternalLink, FileText, X } from "lucide-react";
import { useEffect } from "react";
import type { AppUpdateInfo } from "../../shared/types";

interface ReleaseNotesDialogProps {
  updateInfo: AppUpdateInfo;
  onClose: () => void;
  onDownload: (info: AppUpdateInfo) => void;
  onOpenReleasePage: (url?: string) => void;
}

const formatReleaseVersion = (version?: string) => {
  const trimmed = version?.trim();
  return trimmed ? `v${trimmed.replace(/^v/i, "")}` : "unknown";
};

const formatPublishedAt = (publishedAt?: string) => {
  if (!publishedAt) {
    return "Release date unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(publishedAt));
};

export const ReleaseNotesDialog = ({
  updateInfo,
  onClose,
  onDownload,
  onOpenReleasePage
}: ReleaseNotesDialogProps) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const notes = updateInfo.releaseNotes?.trim() || "No release notes were published for this release.";
  const releaseTitle = updateInfo.releaseName?.trim() || `TimeBro ${formatReleaseVersion(updateInfo.latestVersion)}`;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Release notes">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel release-notes-panel">
        <div className="modal-head">
          <div className="modal-title-row">
            <span className="modal-title">Release notes</span>
            <span className="modal-day">{formatReleaseVersion(updateInfo.latestVersion)}</span>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close release notes">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body release-notes-body">
          <div className="release-notes-meta">
            <FileText size={17} />
            <div>
              <strong>{releaseTitle}</strong>
              <span>{formatPublishedAt(updateInfo.publishedAt)}</span>
            </div>
          </div>
          <pre className="release-notes-copy">{notes}</pre>
        </div>

        <div className="modal-foot">
          <span className="modal-foot-hint">{updateInfo.downloadName ?? "GitHub release"}</span>
          <div className="modal-foot-actions">
            <button type="button" className="modal-cancel" onClick={onClose}>
              Done
            </button>
            <button type="button" className="secondary-button" onClick={() => onOpenReleasePage(updateInfo.releasePageUrl)}>
              <ExternalLink size={16} />
              GitHub
            </button>
            {updateInfo.downloadUrl ? (
              <button type="button" className="primary-button" onClick={() => onDownload(updateInfo)}>
                <Download size={16} />
                Download
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
