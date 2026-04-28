import { useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateQRCode } from '@/lib/qrGenerator';
import { fetchCatalogFromFirebase, upsertQrAssetInFirebase } from '@/lib/studioFirebasePublishApi';

interface AdminPanelProps {}

type LogEntry =
  | { status: 'ok';  id: string }
  | { status: 'err'; id: string; error: string };

export function AdminPanel({}: AdminPanelProps) {
  const [open, setOpen]         = useState(false);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(0);
  const [total, setTotal]       = useState(0);
  const [current, setCurrent]   = useState('');
  const [log, setLog]           = useState<LogEntry[]>([]);
  const [finished, setFinished] = useState(false);

  async function handleBatchRegen() {
    setRunning(true);
    setFinished(false);
    setLog([]);
    setDone(0);
    setTotal(0);
    setCurrent('');

    try {
      const catalog = await fetchCatalogFromFirebase();
      const ids = catalog.map((e) => e.id);
      setTotal(ids.length);

      if (ids.length === 0) {
        setFinished(true);
        setRunning(false);
        return;
      }

      const entries: LogEntry[] = [];
      for (let i = 0; i < catalog.length; i += 1) {
        const entry = catalog[i];
        const id = entry.id;
        setCurrent(id);

        try {
          const qrDataUrl = await generateQRCode(entry.zpkPath);
          await upsertQrAssetInFirebase({ watchfaceId: id, qrDataUrl });
          entries.push({ status: 'ok', id });
        } catch (err) {
          entries.push({
            status: 'err',
            id,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }

        setDone(i + 1);
      }

      setLog(entries);
    } catch (err) {
      setLog([{
        status: 'err',
        id: '—',
        error: err instanceof Error ? err.message : 'Unknown error',
      }]);
    } finally {
      setRunning(false);
      setFinished(true);
      setCurrent('');
    }
  }

  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mt-8 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 hover:bg-zinc-800 transition-colors text-left"
      >
        <span className="text-zinc-400 text-xs font-mono uppercase tracking-widest">
          Admin Tools
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-zinc-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-600" />
        )}
      </button>

      {open && (
        <div className="bg-zinc-950 px-4 py-5 space-y-5">
          {/* Batch regen button */}
          <Button
            onClick={handleBatchRegen}
            disabled={running}
            variant="outline"
            className="w-full h-10 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
            {running ? `Regenerating… (${done}/${total})` : 'Batch Regenerate All QR Codes'}
          </Button>

          {/* Progress bar */}
          {(running || finished) && total > 0 && (
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-zinc-600 text-xs">
                <span>{running && current ? `Processing: ${current}` : finished ? 'Done' : ''}</span>
                <span>{done}/{total}</span>
              </div>
            </div>
          )}

          {/* Log */}
          {log.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-2">
              {log.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-xs py-0.5">
                  {entry.status === 'ok' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <span className={`font-mono ${entry.status === 'ok' ? 'text-zinc-400' : 'text-red-400'}`}>
                    {entry.id}
                  </span>
                  {entry.status === 'err' && (
                    <span className="text-red-600 truncate">{entry.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {finished && log.length > 0 && (
            <p className="text-zinc-500 text-xs">
              {log.filter((e) => e.status === 'ok').length} succeeded ·{' '}
              {log.filter((e) => e.status === 'err').length} failed
            </p>
          )}
        </div>
      )}
    </div>
  );
}
