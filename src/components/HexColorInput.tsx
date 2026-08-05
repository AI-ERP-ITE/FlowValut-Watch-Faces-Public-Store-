import { useEffect, useRef, type ClipboardEvent } from 'react';
import { hexDigitsFromColor, normalizeHexDigits } from '@/lib/hexColor';
import { cn } from '@/lib/utils';

interface HexColorInputProps { value: string; onChange: (color: string) => void; className?: string; }

export function HexColorInput({ value, onChange, className }: HexColorInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = hexDigitsFromColor(value);
  }, [value]);
  const update = (raw: string) => {
    const next = normalizeHexDigits(raw);
    if (inputRef.current) inputRef.current.value = next;
    if (next.length === 6) onChange(`#${next}`);
  };
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    update(event.clipboardData.getData('text'));
  };
  return (
    <div className={cn('flex h-9 items-center rounded-md border border-input bg-transparent text-sm shadow-sm', className)}>
      <span className="select-none pl-3 text-white/45" aria-hidden="true">#</span>
      <input ref={inputRef} aria-label="Hex color digits" defaultValue={hexDigitsFromColor(value)} maxLength={6} spellCheck={false}
        onChange={(event) => update(event.target.value)} onPaste={handlePaste}
        onBlur={() => { if (inputRef.current) inputRef.current.value = hexDigitsFromColor(value); }}
        className="h-full min-w-0 flex-1 bg-transparent px-1.5 font-mono uppercase outline-none" />
    </div>
  );
}
