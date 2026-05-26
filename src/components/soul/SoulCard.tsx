"use client"

import { useRef, useCallback, useEffect } from 'react';
import { Download, Share2 } from 'lucide-react';

interface SoulCardData {
  subject_name: string;
  initials: string;
  dimensions: Record<string, number>;
  dimension_labels: Record<string, string>;
  excerpt?: string;
  calibration_count?: number;
  chat_messages?: number;
}

export function SoulCard({ data }: { data: SoulCardData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas size
    const W = 1080;
    const H = 1350;
    canvas.width = W;
    canvas.height = H;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    const centerX = W / 2;

    // Avatar circle
    const avatarY = 280;
    const avatarR = 120;
    const avatarGrad = ctx.createRadialGradient(centerX, avatarY, 0, centerX, avatarY, avatarR);
    avatarGrad.addColorStop(0, '#818cf8');
    avatarGrad.addColorStop(1, '#6366f1');
    ctx.beginPath();
    ctx.arc(centerX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = avatarGrad;
    ctx.fill();

    // Initials
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.initials.slice(0, 2).toUpperCase(), centerX, avatarY);

    // Name
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    ctx.fillText(data.subject_name, centerX, avatarY + 200);

    // Stats
    ctx.fillStyle = '#94a3b8';
    ctx.font = '32px system-ui, -apple-system, sans-serif';
    const statsY = avatarY + 290;
    const stats = [];
    if (data.calibration_count) stats.push(`${data.calibration_count} calibrations`);
    if (data.chat_messages) stats.push(`${data.chat_messages} conversations`);
    if (stats.length > 0) {
      ctx.fillText(stats.join('  ·  '), centerX, statsY);
    }

    // Divider
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, statsY + 60);
    ctx.lineTo(W - 100, statsY + 60);
    ctx.stroke();

    // 7-dimension radar chart
    const radarY = statsY + 220;
    const radarR = 180;
    const dims = ['cognitive_patterns', 'value_judgment', 'expression_style', 'knowledge_structure', 'emotional_response', 'relationship_memory', 'life_narrative'];
    const labels = dims.map(d => data.dimension_labels[d] || d);
    const values = dims.map(d => data.dimensions[d] || 0.5);
    const n = dims.length;

    // Draw radar
    ctx.save();
    ctx.translate(centerX, radarY);

    // Background polygon
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      const x = Math.cos(angle) * radarR;
      const y = Math.sin(angle) * radarR;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Data polygon
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      const r = radarR * values[i];
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const dataGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radarR);
    dataGrad.addColorStop(0, 'rgba(99, 102, 241, 0.6)');
    dataGrad.addColorStop(1, 'rgba(139, 92, 246, 0.3)');
    ctx.fillStyle = dataGrad;
    ctx.fill();
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      const lr = radarR + 50;
      const x = Math.cos(angle) * lr;
      const y = Math.sin(angle) * lr;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], x, y);
    }

    ctx.restore();

    // Excerpt quote
    if (data.excerpt) {
      const excerptY = radarY + radarR + 120;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'italic 30px system-ui, -apple-system, sans-serif';

      // Word wrap
      const words = data.excerpt.split(' ');
      let line = '';
      let lines: string[] = [];
      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > W - 200) {
          lines.push(line);
          line = word + ' ';
        } else {
          line = test;
        }
      }
      lines.push(line);

      ctx.fillStyle = '#6366f1';
      ctx.font = '60px serif';
      ctx.fillText('"', centerX - 30, excerptY - 20);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'italic 30px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < Math.min(lines.length, 3); i++) {
        ctx.fillText(lines[i], centerX, excerptY + 20 + i * 45);
      }
    }

    // Footer
    const footerY = H - 100;
    ctx.fillStyle = '#6366f1';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('UpAgora · Soul Distillation', centerX, footerY);

    ctx.fillStyle = '#475569';
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.fillText('upa.gora', centerX, footerY + 45);
  }, [data]);

  // Render on mount
  useEffect(() => {
    renderCard();
  }, [renderCard]);

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `soul-card-${data.subject_name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <>
      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Visible card preview (uses CSS to approximate) */}
      <div className="w-full max-w-md mx-auto rounded-2xl bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-500/20 p-8 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-3xl font-bold text-white">
          {data.initials.slice(0, 2).toUpperCase()}
        </div>
        <h3 className="mb-2 text-2xl font-bold text-zinc-50">{data.subject_name}</h3>
        <div className="mb-4 text-sm text-zinc-400">
          {data.calibration_count && `${data.calibration_count} calibrations `}
          {data.calibration_count && data.chat_messages && '· '}
          {data.chat_messages && `${data.chat_messages} conversations`}
        </div>
        {data.excerpt && (
          <blockquote className="mb-6 border-l-2 border-indigo-500 pl-4 text-left italic text-zinc-300">
            "{data.excerpt}"
          </blockquote>
        )}
        <button
          onClick={downloadCard}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
        >
          <Download className="h-4 w-4" />
          Download Soul Card
        </button>
      </div>
    </>
  );
}
