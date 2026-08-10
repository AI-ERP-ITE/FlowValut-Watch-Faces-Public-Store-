import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateQRCode } from '@/lib/qrGenerator';
import { fetchCatalogFromFirebase, upsertQrAssetInFirebase } from '@/lib/studioFirebasePublishApi';
import {
  connectStagingCommerceAdmin,
  disconnectStagingCommerceAdmin,
  stagingCommerceAdminFetch,
  subscribeStagingCommerceAuth,
} from '@/lib/stagingCommerceAdminClient';

interface AdminPanelProps {}

type LogEntry =
  | { status: 'ok';  id: string }
  | { status: 'err'; id: string; error: string };

type VipCodeRow = {
  id: string;
  maskedCode: string;
  percentage: number;
  status: 'PENDING' | 'ACTIVE' | 'REDEEMED' | 'ARCHIVED' | 'FAILED';
  paddleDiscountId: string | null;
  redeemedOrderId: string | null;
};

export function AdminPanel({}: AdminPanelProps) {
  const [open, setOpen]         = useState(false);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(0);
  const [total, setTotal]       = useState(0);
  const [current, setCurrent]   = useState('');
  const [log, setLog]           = useState<LogEntry[]>([]);
  const [finished, setFinished] = useState(false);
  const [vipPercentage, setVipPercentage] = useState(50);
  const [vipBusy, setVipBusy] = useState(false);
  const [newVipCode, setNewVipCode] = useState('');
  const [vipMessage, setVipMessage] = useState('');
  const [vipConnectedEmail, setVipConnectedEmail] = useState('');
  const [vipCodes, setVipCodes] = useState<VipCodeRow[]>([]);

  useEffect(() => subscribeStagingCommerceAuth((user) => {
    setVipConnectedEmail(user?.email || '');
    if (!user) setVipCodes([]);
  }), []);

  async function loadVipPromoCodes() {
    const result = await stagingCommerceAdminFetch<{ codes: VipCodeRow[] }>({ method: 'GET' });
    setVipCodes(result.codes);
  }

  async function connectVipAdmin() {
    setVipBusy(true); setVipMessage('');
    try {
      await connectStagingCommerceAdmin();
      await loadVipPromoCodes();
      setVipMessage('Connected to isolated FlowVault Staging commerce.');
    } catch (error) {
      setVipMessage(error instanceof Error ? error.message : 'Staging connection failed');
    } finally { setVipBusy(false); }
  }

  async function generateVipPromoCode() {
    setVipBusy(true); setNewVipCode(''); setVipMessage('');
    try {
      const result = await stagingCommerceAdminFetch<{ code: string; percentage: number; shownOnce: boolean }>({
        method: 'POST', body: JSON.stringify({ action: 'GENERATE', environment: 'sandbox', percentage: vipPercentage }),
      });
      setNewVipCode(result.code);
      setVipMessage('Copy this code now. FlowVault will not display the full code again.');
      await loadVipPromoCodes();
    } catch (error) {
      setVipMessage(error instanceof Error ? error.message : 'VIP code generation failed');
    } finally { setVipBusy(false); }
  }

  async function archiveVipPromoCode(id: string) {
    if (!window.confirm('Archive this unused Sandbox VIP code? It cannot be used after archiving.')) return;
    setVipBusy(true); setVipMessage('');
    try {
      await stagingCommerceAdminFetch({
        method: 'POST', body: JSON.stringify({ action: 'ARCHIVE', environment: 'sandbox', id }),
      });
      await loadVipPromoCodes();
      setVipMessage('VIP code archived in FlowVault and Paddle Sandbox.');
    } catch (error) {
      setVipMessage(error instanceof Error ? error.message : 'VIP code archive failed');
    } finally { setVipBusy(false); }
  }

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
          <section className="space-y-3 rounded-lg border border-amber-900/50 bg-amber-950/10 p-4">
            <div><h3 className="text-sm font-semibold text-amber-200">VIP single-use code</h3><p className="mt-1 text-xs text-zinc-500">Isolated staging + Paddle Sandbox only. One code grants one transaction and cannot stack with store promotions.</p></div>
            {!vipConnectedEmail ? (
              <Button type="button" onClick={connectVipAdmin} disabled={vipBusy} className="w-full bg-cyan-800 text-white hover:bg-cyan-700">Connect Staging Commerce</Button>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded border border-cyan-900/60 bg-cyan-950/20 p-2 text-xs text-cyan-200">
                <span className="truncate">Connected: {vipConnectedEmail}</span>
                <button type="button" className="text-zinc-400 hover:text-white" onClick={() => void disconnectStagingCommerceAdmin()}>Disconnect</button>
              </div>
            )}
            <label className="block text-xs text-zinc-400">Percentage (1–90)<input type="number" min={1} max={90} step={1} value={vipPercentage} onChange={(event) => setVipPercentage(Number(event.target.value))} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 p-2 text-white" /></label>
            <Button type="button" onClick={generateVipPromoCode} disabled={!vipConnectedEmail || vipBusy || !Number.isInteger(vipPercentage) || vipPercentage < 1 || vipPercentage > 90} className="w-full bg-amber-700 text-white hover:bg-amber-600">{vipBusy ? 'Creating in Paddle Sandbox…' : 'Generate one-time VIP code'}</Button>
            {newVipCode && <div className="space-y-2 rounded border border-emerald-700 bg-emerald-950/30 p-3"><p className="select-all text-center font-mono text-lg text-emerald-200">{newVipCode}</p><Button type="button" variant="outline" className="w-full border-emerald-800 text-emerald-200" onClick={() => void navigator.clipboard.writeText(newVipCode)}>Copy code</Button></div>}
            {vipMessage && <p className="text-xs text-zinc-400">{vipMessage}</p>}
            {vipConnectedEmail && <Button type="button" variant="outline" onClick={() => void loadVipPromoCodes()} disabled={vipBusy} className="w-full border-zinc-700 text-zinc-300">Refresh code status</Button>}
            {vipCodes.length > 0 && <div className="max-h-52 space-y-2 overflow-y-auto">{vipCodes.map((code) => <div key={code.id} className="flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-900 p-2 text-xs"><div><p className="font-mono text-zinc-200">{code.maskedCode}</p><p className="text-zinc-500">{code.percentage}% · {code.status}{code.redeemedOrderId ? ` · ${code.redeemedOrderId}` : ''}</p></div>{(code.status === 'ACTIVE' || code.status === 'FAILED' || code.status === 'PENDING') && <button type="button" disabled={vipBusy} onClick={() => void archiveVipPromoCode(code.id)} className="text-red-400 hover:text-red-300">Archive</button>}</div>)}</div>}
          </section>
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
