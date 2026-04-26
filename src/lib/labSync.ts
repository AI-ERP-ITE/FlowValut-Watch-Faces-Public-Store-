export type LabAssetKind = 'icons' | 'fonts' | 'hands' | 'all';

interface LabAssetsChangedPayload {
  kind: LabAssetKind;
  ts: number;
}

const LAB_ASSETS_CHANGED_EVENT = 'zepp:lab-assets-changed';
const LAB_ASSETS_CHANGED_CHANNEL = 'zepp-lab-assets';

function makePayload(kind: LabAssetKind): LabAssetsChangedPayload {
  return { kind, ts: Date.now() };
}

export function publishLabAssetsChanged(kind: LabAssetKind = 'all'): void {
  if (typeof window === 'undefined') return;

  const payload = makePayload(kind);
  window.dispatchEvent(new CustomEvent<LabAssetsChangedPayload>(LAB_ASSETS_CHANGED_EVENT, { detail: payload }));

  try {
    const channel = new BroadcastChannel(LAB_ASSETS_CHANGED_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // BroadcastChannel unsupported; window event still handles in-tab updates.
  }
}

export function subscribeLabAssetsChanged(
  callback: (payload: LabAssetsChangedPayload) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const onWindowEvent = (event: Event) => {
    const detail = (event as CustomEvent<LabAssetsChangedPayload>).detail;
    callback(detail ?? makePayload('all'));
  };

  window.addEventListener(LAB_ASSETS_CHANGED_EVENT, onWindowEvent);

  let channel: BroadcastChannel | null = null;
  const onChannelMessage = (event: MessageEvent<LabAssetsChangedPayload>) => {
    callback(event.data ?? makePayload('all'));
  };

  try {
    channel = new BroadcastChannel(LAB_ASSETS_CHANGED_CHANNEL);
    channel.addEventListener('message', onChannelMessage);
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener(LAB_ASSETS_CHANGED_EVENT, onWindowEvent);
    if (channel) {
      channel.removeEventListener('message', onChannelMessage);
      channel.close();
    }
  };
}
