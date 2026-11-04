import React, { useState, useEffect, useRef } from 'react';
import CommitteeBadge, { getCommitteeLabel } from './CommitteeBadge';

export default function EventQrModal({
  open,
  onClose,
  event: ev,
  authHeaders,
  isAdmin = false,
  onRefreshQR,
  qrRefreshHash = 0,
  apiBase = ''
}) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const activeBlobRef = useRef(null);

  // Deep-link scan URL for attendees
  const scanUrl = ev?.id
    ? `https://askyouth.online/?scan=${ev.id}${ev.qr_token ? `&t=${ev.qr_token}` : ''}`
    : '';

  useEffect(() => {
    if (!open || !ev?.id) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Revoke previous blob if any
    if (activeBlobRef.current) {
      URL.revokeObjectURL(activeBlobRef.current);
      activeBlobRef.current = null;
    }

    const headers = authHeaders ? authHeaders() : {};
    const url = `${apiBase}/api/events/${ev.id}/qr?h=${qrRefreshHash}`;

    fetch(url, { headers })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}: Failed to generate QR code`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (isMounted) {
          const createdUrl = URL.createObjectURL(blob);
          activeBlobRef.current = createdUrl;
          setBlobUrl(createdUrl);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to generate QR code.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (activeBlobRef.current) {
        URL.revokeObjectURL(activeBlobRef.current);
        activeBlobRef.current = null;
      }
    };
  }, [open, ev?.id, qrRefreshHash, apiBase, authHeaders]);

  if (!open || !ev) return null;

  const handleCopyLink = () => {
    if (!scanUrl) return;
    navigator.clipboard.writeText(scanUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const cleanTitle = (ev.title || 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const filename = `askyouth-qr-${cleanTitle}.png`;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!blobUrl) return;
    const printWindow = window.open('', '_blank', 'width=700,height=800');
    if (!printWindow) return;

    const commName = getCommitteeLabel(ev.committee);
    const dateFormatted = ev.date
      ? new Date(ev.date + 'T00:00:00+08:00').toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Attendance - ${ev.title}</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 24px;
              text-align: center;
            }
            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            .header h4 {
              margin: 0;
              font-size: 11px;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #475569;
            }
            .header h2 {
              margin: 4px 0 0;
              font-size: 18px;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              margin: 16px 0 8px;
              color: #0f172a;
            }
            .meta {
              font-size: 13px;
              color: #475569;
              margin-bottom: 20px;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border: 1px solid #cbd5e1;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 16px;
              background: #f8fafc;
            }
            .qr-frame {
              display: inline-block;
              border: 3px solid #0f172a;
              border-radius: 16px;
              padding: 16px;
              margin: 16px 0;
              background: #ffffff;
            }
            .qr-img {
              width: 320px;
              height: 320px;
              display: block;
            }
            .instructions {
              margin-top: 20px;
              font-size: 14px;
              font-weight: 600;
              color: #334155;
            }
            .sub-instructions {
              margin-top: 4px;
              font-size: 11px;
              color: #64748b;
            }
            .footer {
              margin-top: 36px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 12px;
              font-size: 10px;
              color: #94a3b8;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h4>Republic of the Philippines &bull; Barangay Concepcion Dos</h4>
            <h2>Sangguniang Kabataan Official Attendance Scanner</h2>
          </div>
          <div class="title">${ev.title}</div>
          <div class="badge">${commName}</div>
          <div class="meta">
            ${dateFormatted ? `Date: ${dateFormatted}` : ''}
            ${ev.time ? ` &bull; Time: ${ev.time}` : ''}
            ${ev.location ? `<br>Location: ${ev.location}` : ''}
          </div>
          <div class="qr-frame">
            <img class="qr-img" src="${blobUrl}" alt="Event Attendance QR Code" />
          </div>
          <div class="instructions">
            Scan this official QR Code using your mobile phone camera or web browser.
          </div>
          <div class="sub-instructions">
            Attendance records are verified instantly on the official aSK//YOUTH youth database.
          </div>
          <div class="footer">
            aSK//YOUTH System Verification &bull; Event ID: #${ev.id} &bull; Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' })} SGT
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-slate-300 rounded-3xl w-full max-w-md shadow-2xl text-slate-900 overflow-hidden transition-all flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <CommitteeBadge committee={ev.committee} compact={true} />
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                ev.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : ev.status === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-300'
              }`}>
                {ev.status || 'Upcoming'}
              </span>
            </div>
            <h3 className="text-lg font-display font-bold text-slate-900 leading-snug truncate">
              {ev.title}
            </h3>
            {(ev.date || ev.location) && (
              <p className="text-xs text-slate-500 font-mono mt-1">
                {ev.date} {ev.location ? `// ${ev.location}` : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-bold flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* QR Display Area */}
        <div className="p-6 flex flex-col items-center bg-slate-50/60">
          <div className="relative p-5 bg-white rounded-2xl border-2 border-slate-200 shadow-lg">
            {/* Viewfinder Target Corner Brackets */}
            <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-blue-600 pointer-events-none" />
            <span className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-blue-600 pointer-events-none" />
            <span className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-blue-600 pointer-events-none" />
            <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-blue-600 pointer-events-none" />

            {loading && (
              <div className="w-52 h-52 flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono font-medium text-slate-500">
                  Generating QR...
                </span>
              </div>
            )}

            {!loading && error && (
              <div className="w-52 h-52 flex flex-col items-center justify-center p-4 text-center bg-red-50/50 rounded-xl border border-red-200">
                <span className="text-xs font-bold text-red-700 mb-2">Generation Failed</span>
                <p className="text-[11px] text-red-600 mb-3">{error}</p>
                <button
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    fetch(`${apiBase}/api/events/${ev.id}/qr?h=${Date.now()}`, {
                      headers: authHeaders ? authHeaders() : {}
                    })
                      .then((r) => r.blob())
                      .then((b) => {
                        setBlobUrl(URL.createObjectURL(b));
                        setLoading(false);
                      })
                      .catch((e) => {
                        setError(e.message);
                        setLoading(false);
                      });
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] uppercase rounded-lg shadow-xs cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && blobUrl && (
              <img
                src={blobUrl}
                alt={`QR code for ${ev.title}`}
                className="w-52 h-52 object-contain select-none"
              />
            )}
          </div>

          <p className="text-xs text-slate-600 text-center font-medium mt-4 max-w-xs">
            Youth constituents scan this code with their smartphone camera to log event attendance.
          </p>

          {/* Deep link copy snippet */}
          <div className="w-full mt-3 flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase shrink-0">Link</span>
            <input
              type="text"
              readOnly
              value={scanUrl}
              className="flex-1 text-[11px] font-mono text-slate-700 bg-transparent outline-none truncate cursor-text"
            />
            <button
              onClick={handleCopyLink}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={loading || !!error || !blobUrl}
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Download PNG
            </button>
            <button
              disabled={loading || !!error || !blobUrl}
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-200"
            >
              Print Sign
            </button>
          </div>

          {isAdmin && onRefreshQR && (
            <button
              onClick={() => onRefreshQR(ev.id)}
              className="w-full px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono"
            >
              Rotate QR Token (Admin Only)
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer font-mono mt-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
