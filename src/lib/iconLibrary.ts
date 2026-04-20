export interface IconEntry {
  key: string;
  label: string;
  category: 'health' | 'fitness' | 'weather' | 'system' | 'time';
  source?: 'custom' | 'tabler';
  dataUrl: string;
  width: number;
  height: number;
}

function drawIcon(draw: (ctx: CanvasRenderingContext2D, s: number) => void): string {
  const s = 48;
  const canvas = document.createElement('canvas');
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);
  draw(ctx, s);
  return canvas.toDataURL('image/png');
}

function makeBattery(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 2.5; ctx.fillStyle = '#44ff88';
  ctx.beginPath(); ctx.roundRect(4, 12, 34, 24, 3); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(38, 18, 6, 12, 2); ctx.fill();
  ctx.fillRect(7, 15, 20, 18);
}

function makeHeart(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#ff4466';
  ctx.beginPath();
  const x = s / 2, y = s / 2 + 2;
  ctx.moveTo(x, y + 10);
  ctx.bezierCurveTo(x - 18, y, x - 18, y - 14, x, y - 8);
  ctx.bezierCurveTo(x + 18, y - 14, x + 18, y, x, y + 10);
  ctx.fill();
}

function makeSteps(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ff9933';
  // Left foot
  ctx.beginPath(); ctx.ellipse(12, 30, 7, 10, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(6, 20, 10, 6, 2); ctx.fill();
  // Right foot offset
  ctx.fillStyle = '#ffbb55';
  ctx.beginPath(); ctx.ellipse(30, 22, 7, 10, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(26, 12, 10, 6, 2); ctx.fill();
}

function makeCalories(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.moveTo(24, 4);
  ctx.bezierCurveTo(32, 14, 38, 22, 36, 30);
  ctx.bezierCurveTo(34, 38, 28, 44, 24, 44);
  ctx.bezierCurveTo(20, 44, 14, 38, 12, 30);
  ctx.bezierCurveTo(10, 22, 16, 14, 24, 4);
  ctx.fill();
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.moveTo(24, 16);
  ctx.bezierCurveTo(28, 22, 30, 28, 28, 33);
  ctx.bezierCurveTo(26, 37, 24, 38, 22, 35);
  ctx.bezierCurveTo(18, 30, 20, 22, 24, 16);
  ctx.fill();
}

function makeSpo2(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#00ccff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('O', s / 2 - 5, s / 2);
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('₂', s / 2 + 9, s / 2 + 4);
  ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2); ctx.stroke();
}

function makeDistance(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#3399ff';
  ctx.beginPath();
  ctx.arc(24, 18, 10, Math.PI, 0);
  ctx.lineTo(34, 18);
  ctx.lineTo(24, 38);
  ctx.lineTo(14, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#001133';
  ctx.beginPath(); ctx.arc(24, 18, 5, 0, Math.PI * 2); ctx.fill();
}

function makeStress(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#aa44ff'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(4, 30);
  ctx.lineTo(12, 18);
  ctx.lineTo(18, 26);
  ctx.lineTo(24, 10);
  ctx.lineTo(30, 22);
  ctx.lineTo(36, 16);
  ctx.lineTo(44, 28);
  ctx.stroke();
}

function makeSleep(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#7766ff';
  ctx.beginPath();
  ctx.arc(24, 24, 16, Math.PI * 0.8, Math.PI * 2.2);
  ctx.arc(18, 18, 10, Math.PI * 1.5, Math.PI * 0.5, true);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#aaaaff';
  ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('z', 36, 14);
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText('z', 40, 8);
}

function makeAlarm(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ffdd00';
  ctx.beginPath();
  ctx.arc(24, 24, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath(); ctx.arc(24, 24, 4, 0, Math.PI * 2); ctx.fill();
  // Bell handle
  ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(24, 12, 5, Math.PI, 0); ctx.stroke();
  // Ringer dots
  ctx.fillStyle = '#ffdd00';
  ctx.beginPath(); ctx.arc(10, 24, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(38, 24, 3, 0, Math.PI * 2); ctx.fill();
}

function makeBluetooth(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#4499ff'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(16, 34); ctx.lineTo(32, 14); ctx.lineTo(24, 8);
  ctx.lineTo(24, 40); ctx.lineTo(32, 34); ctx.lineTo(16, 14);
  ctx.stroke();
}

function makeWeatherSun(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ffdd00';
  ctx.beginPath(); ctx.arc(24, 24, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 2.5;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(24 + Math.cos(a) * 14, 24 + Math.sin(a) * 14);
    ctx.lineTo(24 + Math.cos(a) * 20, 24 + Math.sin(a) * 20);
    ctx.stroke();
  }
}

function makeWeatherCloud(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#aabbcc';
  ctx.beginPath();
  ctx.arc(18, 26, 10, 0, Math.PI * 2);
  ctx.arc(28, 22, 12, 0, Math.PI * 2);
  ctx.arc(36, 28, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#aabbcc';
  ctx.fillRect(10, 26, 34, 12);
}

function makeNotification(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ff4444';
  ctx.beginPath(); ctx.arc(36, 12, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ccccff';
  ctx.strokeStyle = '#ccccff'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(10, 40); ctx.lineTo(12, 14); ctx.arc(24, 14, 12, Math.PI, 0);
  ctx.lineTo(38, 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#888899';
  ctx.beginPath(); ctx.arc(24, 43, 4, 0, Math.PI * 2); ctx.fill();
}

function makeMoon(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ccddff';
  ctx.beginPath();
  ctx.arc(24, 24, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111122';
  ctx.beginPath();
  ctx.arc(30, 20, 14, 0, Math.PI * 2); ctx.fill();
}

function makePai(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ff3355';
  ctx.beginPath(); ctx.arc(24, 24, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('P', 24, 25);
}

function makeStand(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#44cc66';
  ctx.beginPath(); ctx.arc(24, 10, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(24, 16); ctx.lineTo(20, 28); ctx.lineTo(16, 44);
  ctx.lineTo(20, 44); ctx.lineTo(24, 34); ctx.lineTo(28, 44);
  ctx.lineTo(32, 44); ctx.lineTo(28, 28); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(24, 20); ctx.lineTo(14, 28); ctx.lineTo(34, 28); ctx.closePath(); ctx.fill();
}

function makeFatBurn(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ff7700';
  ctx.beginPath();
  ctx.moveTo(24, 4);
  ctx.bezierCurveTo(30, 12, 34, 18, 32, 26);
  ctx.bezierCurveTo(30, 32, 26, 36, 24, 36);
  ctx.bezierCurveTo(22, 36, 18, 32, 16, 26);
  ctx.bezierCurveTo(14, 18, 18, 12, 24, 4);
  ctx.fill();
  ctx.fillStyle = '#44aaff';
  ctx.beginPath(); ctx.arc(28, 38, 6, 0, Math.PI * 2); ctx.fill();
}

function makeUvi(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#ffee00';
  ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('UV', s / 2, s / 2 - 4);
  ctx.strokeStyle = '#ffee00'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(8, 34); ctx.lineTo(40, 34); ctx.stroke();
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('index', s / 2, s / 2 + 12);
}

function makeAqi(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#44cc44';
  ctx.beginPath();
  ctx.moveTo(24, 6);
  ctx.bezierCurveTo(36, 6, 42, 18, 40, 28);
  ctx.bezierCurveTo(38, 38, 30, 44, 24, 44);
  ctx.bezierCurveTo(18, 44, 10, 38, 8, 28);
  ctx.bezierCurveTo(6, 18, 12, 6, 24, 6);
  ctx.fill();
  ctx.strokeStyle = '#006600'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(24, 12); ctx.lineTo(24, 38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 12); ctx.bezierCurveTo(30, 18, 30, 26, 24, 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 22); ctx.bezierCurveTo(18, 28, 18, 34, 24, 38); ctx.stroke();
}

function makeHumidity(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#3388ff';
  ctx.beginPath();
  ctx.moveTo(24, 6);
  ctx.bezierCurveTo(34, 18, 40, 28, 38, 34);
  ctx.bezierCurveTo(36, 42, 28, 46, 24, 44);
  ctx.bezierCurveTo(20, 46, 12, 42, 10, 34);
  ctx.bezierCurveTo(8, 28, 14, 18, 24, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.ellipse(19, 28, 4, 7, -0.5, 0, Math.PI * 2); ctx.fill();
}

function makeRunning(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ffaa33';
  ctx.beginPath(); ctx.arc(24, 8, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffaa33'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(24, 13); ctx.lineTo(20, 24); ctx.lineTo(14, 32); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, 24); ctx.lineTo(28, 30); ctx.lineTo(34, 38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 13); ctx.lineTo(30, 20); ctx.lineTo(38, 18); ctx.stroke();
}

function makeCycling(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#55bbff'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(14, 34, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(34, 34, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(14, 34); ctx.lineTo(24, 18); ctx.lineTo(34, 34); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 18); ctx.lineTo(28, 10); ctx.stroke();
  ctx.fillStyle = '#55bbff';
  ctx.beginPath(); ctx.arc(14, 34, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(34, 34, 3, 0, Math.PI * 2); ctx.fill();
}

function makeSwimming(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#3399ff';
  ctx.beginPath(); ctx.arc(24, 14, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3399ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(24, 19); ctx.lineTo(24, 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 22); ctx.lineTo(14, 26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 22); ctx.lineTo(34, 26); ctx.stroke();
  ctx.strokeStyle = '#55bbff'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(6, 38); ctx.bezierCurveTo(12, 34, 16, 42, 22, 38); ctx.bezierCurveTo(28, 34, 32, 42, 38, 38); ctx.lineTo(42, 36);
  ctx.stroke();
}

function makeWeatherRain(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#aabbcc';
  ctx.beginPath(); ctx.arc(16, 22, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(26, 18, 11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(34, 24, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(8, 22, 32, 8);
  ctx.strokeStyle = '#3399ff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(14 + i * 8, 34); ctx.lineTo(12 + i * 8, 42); ctx.stroke();
  }
}

function makeWeatherSnow(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ccddef';
  ctx.beginPath(); ctx.arc(16, 22, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(26, 18, 11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(34, 24, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(8, 22, 32, 8);
  ctx.fillStyle = '#aaccff';
  const pts = [14, 22, 30, 38];
  pts.forEach(x => {
    ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('*', x, 40);
  });
}

function makeTemperature(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#ff6644'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(20, 4, 8, 28, 4); ctx.stroke();
  ctx.fillStyle = '#ff6644';
  ctx.beginPath(); ctx.arc(24, 36, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(21, 16, 6, 20);
  ctx.strokeStyle = '#ff6644'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(28, 10 + i * 6); ctx.lineTo(34, 10 + i * 6); ctx.stroke();
  }
}

function makeWind(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(6, 18); ctx.bezierCurveTo(20, 12, 32, 12, 36, 14); ctx.bezierCurveTo(40, 16, 40, 20, 36, 22); ctx.bezierCurveTo(32, 24, 28, 22, 28, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, 26); ctx.lineTo(38, 26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, 34); ctx.bezierCurveTo(20, 28, 30, 28, 34, 30); ctx.bezierCurveTo(38, 32, 38, 36, 34, 38); ctx.bezierCurveTo(30, 40, 26, 38, 26, 38); ctx.stroke();
}

function makeBarometer(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#aaaaff'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(24, 24, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(24, 24, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(32, 16); ctx.stroke();
  ctx.fillStyle = '#aaaaff';
  ctx.beginPath(); ctx.arc(24, 24, 3, 0, Math.PI * 2); ctx.fill();
}

function makeBatteryLow(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2.5; ctx.fillStyle = '#ff4444';
  ctx.beginPath(); ctx.roundRect(4, 12, 34, 24, 3); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(38, 18, 6, 12, 2); ctx.fill();
  ctx.fillRect(7, 15, 8, 18);
  ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('!', 28, 24);
}

function makeWifi(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#44ddff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  const arcs = [18, 12, 6];
  arcs.forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(24, 30, r + 4 + i * 4, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  });
  ctx.fillStyle = '#44ddff';
  ctx.beginPath(); ctx.arc(24, 38, 3, 0, Math.PI * 2); ctx.fill();
}

function makeGear(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#aaaaaa';
  const teeth = 8;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * Math.PI * 2;
    const a2 = ((i + 0.4) / teeth) * Math.PI * 2;
    const a3 = ((i + 0.6) / teeth) * Math.PI * 2;
    const a4 = ((i + 1) / teeth) * Math.PI * 2;
    ctx.lineTo(24 + Math.cos(a1) * 16, 24 + Math.sin(a1) * 16);
    ctx.lineTo(24 + Math.cos(a2) * 20, 24 + Math.sin(a2) * 20);
    ctx.lineTo(24 + Math.cos(a3) * 20, 24 + Math.sin(a3) * 20);
    ctx.lineTo(24 + Math.cos(a4) * 16, 24 + Math.sin(a4) * 16);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#222222';
  ctx.beginPath(); ctx.arc(24, 24, 7, 0, Math.PI * 2); ctx.fill();
}

function makeDnd(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#9955ff'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(24, 24, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#9955ff';
  ctx.beginPath(); ctx.arc(24, 20, 8, Math.PI * 0.9, Math.PI * 2.1); ctx.arc(18, 16, 6, Math.PI * 1.4, Math.PI * 0.6, true); ctx.closePath(); ctx.fill();
}

function makeAirplane(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#aaccff';
  ctx.beginPath();
  ctx.moveTo(24, 4); ctx.lineTo(28, 20); ctx.lineTo(42, 28); ctx.lineTo(40, 32); ctx.lineTo(28, 26);
  ctx.lineTo(26, 38); ctx.lineTo(32, 42); ctx.lineTo(30, 44); ctx.lineTo(24, 40);
  ctx.lineTo(18, 44); ctx.lineTo(16, 42); ctx.lineTo(22, 38); ctx.lineTo(20, 26);
  ctx.lineTo(8, 32); ctx.lineTo(6, 28); ctx.lineTo(20, 20); ctx.closePath(); ctx.fill();
}

function makeSunrise(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(6, 32); ctx.lineTo(42, 32); ctx.stroke();
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath(); ctx.arc(24, 32, 10, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.2 + i * 0.15);
    ctx.beginPath();
    ctx.moveTo(24 + Math.cos(a) * 14, 32 + Math.sin(a) * 14);
    ctx.lineTo(24 + Math.cos(a) * 20, 32 + Math.sin(a) * 20);
    ctx.stroke();
  }
  ctx.fillStyle = '#ff8800';
  ctx.beginPath(); ctx.moveTo(20, 14); ctx.lineTo(24, 6); ctx.lineTo(28, 14); ctx.closePath(); ctx.fill();
}

function makeSunset(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(6, 32); ctx.lineTo(42, 32); ctx.stroke();
  ctx.fillStyle = '#ff8800';
  ctx.beginPath(); ctx.arc(24, 32, 10, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.2 + i * 0.15);
    ctx.beginPath();
    ctx.moveTo(24 + Math.cos(a) * 14, 32 + Math.sin(a) * 14);
    ctx.lineTo(24 + Math.cos(a) * 20, 32 + Math.sin(a) * 20);
    ctx.stroke();
  }
  ctx.fillStyle = '#ff4400';
  ctx.beginPath(); ctx.moveTo(20, 24); ctx.lineTo(24, 32); ctx.lineTo(28, 24); ctx.closePath(); ctx.fill();
}

function makeStopwatch(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#88ddff'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(24, 26, 16, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(24, 26); ctx.lineTo(24, 14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 26); ctx.lineTo(32, 22); ctx.stroke();
  ctx.fillStyle = '#88ddff';
  ctx.beginPath(); ctx.roundRect(20, 8, 8, 4, 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(34, 14); ctx.lineTo(38, 10); ctx.stroke();
}

function makeHourglass(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ddaa55';
  ctx.beginPath();
  ctx.moveTo(8, 6); ctx.lineTo(40, 6); ctx.lineTo(28, 24); ctx.lineTo(40, 42); ctx.lineTo(8, 42); ctx.lineTo(20, 24); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffcc77'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(40, 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, 42); ctx.lineTo(40, 42); ctx.stroke();
}

function makeWorldClock(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#44aaff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(24, 24, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(24, 24, 8, 18, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, 24); ctx.lineTo(42, 24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 6); ctx.lineTo(24, 42); ctx.stroke();
  ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(24, 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(32, 24); ctx.stroke();
}

function makeCharging(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 2.5; ctx.fillStyle = '#44ff88';
  // Battery shell
  ctx.beginPath(); ctx.roundRect(4, 12, 34, 24, 3); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(38, 18, 6, 12, 2); ctx.fill();
  // Lightning bolt inside
  ctx.fillStyle = '#44ff88';
  ctx.beginPath();
  ctx.moveTo(26, 15); ctx.lineTo(18, 26); ctx.lineTo(24, 26);
  ctx.lineTo(22, 33); ctx.lineTo(30, 22); ctx.lineTo(24, 22);
  ctx.closePath(); ctx.fill();
}

function makeLock(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#ffaa55'; ctx.lineWidth = 2.5; ctx.fillStyle = '#ffaa55';
  // Shackle
  ctx.beginPath();
  ctx.arc(24, 20, 10, Math.PI, 0);
  ctx.stroke();
  // Body
  ctx.beginPath(); ctx.roundRect(10, 22, 28, 22, 4); ctx.fill();
  // Keyhole
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath(); ctx.arc(24, 31, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(22, 31, 4, 8);
}

function makeGps(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#44ddff'; ctx.lineWidth = 2;
  // Globe arcs
  ctx.beginPath(); ctx.arc(24, 24, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(24, 24, 8, 18, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, 24); ctx.lineTo(42, 24); ctx.stroke();
  // GPS pin overlay
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(24, 16, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(20, 19); ctx.lineTo(24, 28); ctx.lineTo(28, 19);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath(); ctx.arc(24, 16, 2, 0, Math.PI * 2); ctx.fill();
}

function makeNfc(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#aa88ff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  // NFC waves emanating right
  const radii = [6, 11, 16];
  radii.forEach(r => {
    ctx.beginPath();
    ctx.arc(20, 24, r, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  });
  // NFC chip dot
  ctx.fillStyle = '#aa88ff';
  ctx.beginPath(); ctx.arc(16, 24, 3, 0, Math.PI * 2); ctx.fill();
  // N letter
  ctx.strokeStyle = '#aa88ff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(6, 32); ctx.lineTo(6, 18); ctx.lineTo(13, 32); ctx.lineTo(13, 18);
  ctx.stroke();
}

function makeVolume(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#cccccc';
  // Speaker body
  ctx.beginPath();
  ctx.moveTo(8, 18); ctx.lineTo(18, 18); ctx.lineTo(26, 10);
  ctx.lineTo(26, 38); ctx.lineTo(18, 30); ctx.lineTo(8, 30);
  ctx.closePath(); ctx.fill();
  // Sound waves
  ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(26, 24, 6, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
  ctx.beginPath(); ctx.arc(26, 24, 11, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
  ctx.beginPath(); ctx.arc(26, 24, 16, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
}

function makeGym(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#ffaa33'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  // Barbell bar
  ctx.beginPath(); ctx.moveTo(8, 24); ctx.lineTo(40, 24); ctx.stroke();
  // Left weights
  ctx.strokeStyle = '#ffaa33'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(8, 18); ctx.lineTo(8, 30); ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(12, 16); ctx.lineTo(12, 32); ctx.stroke();
  // Right weights
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(40, 18); ctx.lineTo(40, 30); ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(36, 16); ctx.lineTo(36, 32); ctx.stroke();
}

function makeYoga(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#aa66ff';
  // Head
  ctx.beginPath(); ctx.arc(24, 8, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#aa66ff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  // Body torso
  ctx.beginPath(); ctx.moveTo(24, 13); ctx.lineTo(24, 26); ctx.stroke();
  // Arms out wide (warrior pose)
  ctx.beginPath(); ctx.moveTo(24, 18); ctx.lineTo(6, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 18); ctx.lineTo(42, 22); ctx.stroke();
  // Legs spread
  ctx.beginPath(); ctx.moveTo(24, 26); ctx.lineTo(12, 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 26); ctx.lineTo(36, 40); ctx.stroke();
}

function makeHiking(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#88bb44';
  // Head
  ctx.beginPath(); ctx.arc(22, 8, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#88bb44'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  // Body leaning forward
  ctx.beginPath(); ctx.moveTo(22, 13); ctx.lineTo(20, 26); ctx.stroke();
  // Back arm with hiking pole
  ctx.beginPath(); ctx.moveTo(22, 18); ctx.lineTo(30, 22); ctx.stroke();
  ctx.strokeStyle = '#88bb44'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(30, 22); ctx.lineTo(34, 42); ctx.stroke();
  // Front arm
  ctx.strokeStyle = '#88bb44'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(22, 18); ctx.lineTo(14, 24); ctx.stroke();
  // Legs mid-stride
  ctx.beginPath(); ctx.moveTo(20, 26); ctx.lineTo(14, 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, 26); ctx.lineTo(28, 38); ctx.stroke();
  // Mountain hint
  ctx.strokeStyle = '#aaccaa'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(32, 42); ctx.lineTo(38, 28); ctx.lineTo(44, 42); ctx.stroke();
}

function makeBodyTemp(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#ff6655'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(20, 4, 8, 26, 4); ctx.stroke();
  ctx.fillStyle = '#ff6655';
  ctx.beginPath(); ctx.arc(24, 34, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(21, 14, 6, 20);
  ctx.strokeStyle = '#ff6655'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(28, 8 + i * 6); ctx.lineTo(34, 8 + i * 6); ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('°C', 38, 8);
}

function makeHydration(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#33aaff';
  ctx.beginPath();
  ctx.moveTo(24, 4);
  ctx.bezierCurveTo(34, 16, 40, 26, 38, 33);
  ctx.bezierCurveTo(36, 42, 28, 46, 24, 44);
  ctx.bezierCurveTo(20, 46, 12, 42, 10, 33);
  ctx.bezierCurveTo(8, 26, 14, 16, 24, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(18, 26, 4, 8, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('%', 24, 28);
}

function makeBreathRate(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  // Lungs outline left
  ctx.beginPath();
  ctx.moveTo(22, 14); ctx.lineTo(22, 22);
  ctx.bezierCurveTo(22, 34, 10, 36, 10, 28);
  ctx.bezierCurveTo(10, 20, 16, 18, 22, 22);
  ctx.stroke();
  // Lungs outline right
  ctx.beginPath();
  ctx.moveTo(26, 14); ctx.lineTo(26, 22);
  ctx.bezierCurveTo(26, 34, 38, 36, 38, 28);
  ctx.bezierCurveTo(38, 20, 32, 18, 26, 22);
  ctx.stroke();
  // Trachea
  ctx.beginPath(); ctx.moveTo(22, 14); ctx.lineTo(26, 14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 10); ctx.lineTo(24, 14); ctx.stroke();
}

function makeEcg(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#ff3366'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(4, 28);
  ctx.lineTo(10, 28);
  ctx.lineTo(14, 20);
  ctx.lineTo(18, 36);
  ctx.lineTo(20, 10);
  ctx.lineTo(22, 38);
  ctx.lineTo(26, 28);
  ctx.lineTo(44, 28);
  ctx.stroke();
}

function makeMenstrual(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.fillStyle = '#ff6699';
  // Main drop
  ctx.beginPath();
  ctx.moveTo(24, 6);
  ctx.bezierCurveTo(34, 18, 38, 28, 36, 34);
  ctx.bezierCurveTo(34, 42, 28, 46, 24, 44);
  ctx.bezierCurveTo(20, 46, 14, 42, 12, 34);
  ctx.bezierCurveTo(10, 28, 14, 18, 24, 6);
  ctx.fill();
  // Cycle arrows hint
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(24, 28, 8, Math.PI * 1.1, Math.PI * 2.9); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(24 + Math.cos(Math.PI * 2.9) * 8 - 3, 28 + Math.sin(Math.PI * 2.9) * 8 + 2);
  ctx.lineTo(24 + Math.cos(Math.PI * 2.9) * 8, 28 + Math.sin(Math.PI * 2.9) * 8);
  ctx.lineTo(24 + Math.cos(Math.PI * 2.9) * 8 + 3, 28 + Math.sin(Math.PI * 2.9) * 8 + 2);
  ctx.stroke();
}

function makeCalendar(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#55aaff'; ctx.lineWidth = 2.5; ctx.fillStyle = '#55aaff';
  // Calendar shell
  ctx.beginPath(); ctx.roundRect(4, 10, 40, 36, 4); ctx.stroke();
  // Header band
  ctx.fillStyle = '#55aaff';
  ctx.beginPath(); ctx.roundRect(4, 10, 40, 11, [4, 4, 0, 0]); ctx.fill();
  // Binding rings
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath(); ctx.roundRect(13, 6, 4, 10, 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(31, 6, 4, 10, 2); ctx.fill();
  // Grid dots (3x3)
  ctx.fillStyle = '#55aaff';
  [14, 24, 34].forEach(x => [28, 35, 42].forEach(y => {
    ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
  }));
}

function makeCountdown(ctx: CanvasRenderingContext2D, _s: number) {
  ctx.strokeStyle = '#ff9944'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  // Outer ring
  ctx.beginPath(); ctx.arc(24, 24, 18, 0, Math.PI * 2); ctx.stroke();
  // Countdown arc (about 2/3 filled)
  ctx.strokeStyle = '#ff9944'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(24, 24, 13, -Math.PI / 2, Math.PI * 0.8); ctx.stroke();
  // Center digit "3"
  ctx.fillStyle = '#ff9944';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('3', 24, 25);
  // Top notch
  ctx.fillStyle = '#ff9944';
  ctx.beginPath(); ctx.roundRect(21, 4, 6, 4, 1); ctx.fill();
}

const ICON_DEFS: Array<{ key: string; label: string; category: 'health' | 'fitness' | 'weather' | 'system' | 'time'; draw: (ctx: CanvasRenderingContext2D, s: number) => void }> = [
  { key: 'battery',       label: 'Battery',          category: 'health',       draw: makeBattery },
  { key: 'heart',         label: 'Heart Rate',        category: 'health',       draw: makeHeart },
  { key: 'steps',         label: 'Steps',             category: 'health',       draw: makeSteps },
  { key: 'calories',      label: 'Calories',          category: 'health',       draw: makeCalories },
  { key: 'spo2',          label: 'SpO2',              category: 'health',       draw: makeSpo2 },
  { key: 'distance',      label: 'Distance',          category: 'health',       draw: makeDistance },
  { key: 'stress',        label: 'Stress',            category: 'health',       draw: makeStress },
  { key: 'sleep',         label: 'Sleep',             category: 'health',       draw: makeSleep },
  { key: 'pai',           label: 'PAI',               category: 'health',       draw: makePai },
  { key: 'stand',         label: 'Stand',             category: 'health',       draw: makeStand },
  { key: 'fat_burn',      label: 'Fat Burn',          category: 'health',       draw: makeFatBurn },
  { key: 'body_temp',     label: 'Body Temperature',  category: 'health',       draw: makeBodyTemp },
  { key: 'hydration',     label: 'Hydration',         category: 'health',       draw: makeHydration },
  { key: 'breath_rate',   label: 'Breathing Rate',    category: 'health',       draw: makeBreathRate },
  { key: 'ecg',           label: 'ECG',               category: 'health',       draw: makeEcg },
  { key: 'menstrual',     label: 'Menstrual Cycle',   category: 'health',       draw: makeMenstrual },
  { key: 'running',       label: 'Running',           category: 'fitness',      draw: makeRunning },
  { key: 'cycling',       label: 'Cycling',           category: 'fitness',      draw: makeCycling },
  { key: 'swimming',      label: 'Swimming',          category: 'fitness',      draw: makeSwimming },
  { key: 'gym',           label: 'Gym / Strength',    category: 'fitness',      draw: makeGym },
  { key: 'yoga',          label: 'Yoga',              category: 'fitness',      draw: makeYoga },
  { key: 'hiking',        label: 'Hiking',            category: 'fitness',      draw: makeHiking },
  { key: 'alarm',         label: 'Alarm',             category: 'time',         draw: makeAlarm },
  { key: 'bluetooth',     label: 'Bluetooth',         category: 'system',       draw: makeBluetooth },
  { key: 'weather_sun',   label: 'Weather: Sun',      category: 'weather',      draw: makeWeatherSun },
  { key: 'weather_cloud', label: 'Weather: Cloud',    category: 'weather',      draw: makeWeatherCloud },
  { key: 'weather_rain',  label: 'Weather: Rain',     category: 'weather',      draw: makeWeatherRain },
  { key: 'weather_snow',  label: 'Weather: Snow',     category: 'weather',      draw: makeWeatherSnow },
  { key: 'temperature',   label: 'Temperature',       category: 'weather',      draw: makeTemperature },
  { key: 'wind',          label: 'Wind',              category: 'weather',      draw: makeWind },
  { key: 'barometer',     label: 'Barometer',         category: 'weather',      draw: makeBarometer },
  { key: 'notification',  label: 'Notification',      category: 'system',       draw: makeNotification },
  { key: 'moon',          label: 'Moon Phase',        category: 'weather',      draw: makeMoon },
  { key: 'uvi',           label: 'UV Index',          category: 'weather',      draw: makeUvi },
  { key: 'aqi',           label: 'Air Quality',       category: 'weather',      draw: makeAqi },
  { key: 'humidity',      label: 'Humidity',          category: 'weather',      draw: makeHumidity },
  { key: 'battery_low',   label: 'Battery Low',       category: 'system',       draw: makeBatteryLow },
  { key: 'charging',      label: 'Charging',           category: 'system',       draw: makeCharging },
  { key: 'lock',          label: 'Lock / Security',    category: 'system',       draw: makeLock },
  { key: 'gps',           label: 'GPS',                category: 'system',       draw: makeGps },
  { key: 'nfc',           label: 'NFC',                category: 'system',       draw: makeNfc },
  { key: 'volume',        label: 'Volume',             category: 'system',       draw: makeVolume },
  { key: 'wifi',          label: 'Wi-Fi',             category: 'system',       draw: makeWifi },
  { key: 'settings',      label: 'Settings',          category: 'system',       draw: makeGear },
  { key: 'dnd',           label: 'Do Not Disturb',    category: 'system',       draw: makeDnd },
  { key: 'airplane',      label: 'Airplane Mode',     category: 'system',       draw: makeAirplane },
  { key: 'sunrise',       label: 'Sunrise',           category: 'time',         draw: makeSunrise },
  { key: 'sunset',        label: 'Sunset',            category: 'time',         draw: makeSunset },
  { key: 'stopwatch',     label: 'Stopwatch',         category: 'time',         draw: makeStopwatch },
  { key: 'timer',         label: 'Timer',             category: 'time',         draw: makeHourglass },
  { key: 'world_clock',   label: 'World Clock',       category: 'time',         draw: makeWorldClock },
  { key: 'calendar',      label: 'Calendar',          category: 'time',         draw: makeCalendar },
  { key: 'countdown',     label: 'Countdown',         category: 'time',         draw: makeCountdown },
];

export const ICON_KEYS = ICON_DEFS.map(d => d.key);

function generateAllIcons(): IconEntry[] {
  return ICON_DEFS.map(def => ({
    key: def.key,
    label: def.label,
    category: def.category,
    source: 'custom' as const,
    dataUrl: drawIcon(def.draw),
    width: 48,
    height: 48,
  }));
}

let _cache: IconEntry[] | null = null;

/** Returns the custom hand-drawn icon library (synchronous). */
export function getIconLibrary(): IconEntry[] {
  if (!_cache) _cache = generateAllIcons();
  return _cache;
}

/**
 * Look up an icon by key — checks custom library first, then the Tabler cache.
 * For Tabler icons that haven't been rendered yet, returns undefined synchronously.
 * Use getIconByKeyAsync() to guarantee a result for Tabler keys.
 */
export function getIconByKey(key: string): IconEntry | undefined {
  // Custom icons (fast path)
  const custom = getIconLibrary().find(i => i.key === key);
  if (custom) return custom;
  // Tabler icons (from cache, already rendered)
  if (key.startsWith('tabler:')) {
    const { getTablerIconByKey } = require('./tablerIconRenderer') as typeof import('./tablerIconRenderer');
    return getTablerIconByKey(key);
  }
  return undefined;
}

/**
 * Async version of getIconByKey — renders Tabler icons on demand if not cached.
 */
export async function getIconByKeyAsync(key: string): Promise<IconEntry | undefined> {
  const custom = getIconLibrary().find(i => i.key === key);
  if (custom) return custom;
  if (key.startsWith('tabler:')) {
    const { renderAndCacheTablerIcon } = await import('./tablerIconRenderer');
    return renderAndCacheTablerIcon(key);
  }
  return undefined;
}

/**
 * Returns custom icons + all rendered Tabler icons.
 * Triggers async build of Tabler library if not started yet.
 */
export async function getFullIconLibrary(): Promise<IconEntry[]> {
  const { buildTablerLibrary } = await import('./tablerIconRenderer');
  const [custom, tabler] = await Promise.all([getIconLibrary(), buildTablerLibrary()]);
  return [...custom, ...tabler];
}

/**
 * Merge extra icon entries (e.g. from IndexedDB custom icons) into the in-memory cache.
 * Called at app startup so custom icons appear in the picker immediately.
 */
export function registerCustomIconsInLibrary(icons: Array<{
  key: string;
  dataUrl: string;
  width: number;
  height: number;
  label?: string;
  name?: string;
  category?: string;
}>): void {
  if (!_cache) _cache = generateAllIcons();
  // Avoid duplicates by key
  const existingKeys = new Set(_cache.map(i => i.key));
  for (const icon of icons) {
    if (!existingKeys.has(icon.key)) {
      _cache.push({
        key: icon.key,
        label: icon.label ?? icon.name ?? icon.key,
        category: (icon.category as IconEntry['category']) ?? 'system',
        source: 'custom',
        dataUrl: icon.dataUrl,
        width: icon.width,
        height: icon.height,
      });
      existingKeys.add(icon.key);
    }
  }
}
