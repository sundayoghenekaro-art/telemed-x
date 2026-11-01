import { format } from 'date-fns';

interface ExportOptions {
  messages: { role: 'user' | 'assistant'; content: string }[];
  patientName?: string | null;
  conversationTitle?: string;
}

export function exportChatAsPdf({ messages, patientName, conversationTitle }: ExportOptions) {
  const now = format(new Date(), 'yyyy-MM-dd HH:mm');
  const title = conversationTitle || 'AI Clinical Assistant Session';

  const messagesHtml = messages
    .map((msg) => {
      const label = msg.role === 'user' ? 'Physician' : 'AI Assistant';
      const bgColor = msg.role === 'user' ? '#e8f4fd' : '#f5f5f5';
      const borderColor = msg.role === 'user' ? '#2196F3' : '#9e9e9e';
      // Convert basic markdown: bold, headers, bullets
      const content = msg.content
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^### (.+)$/gm, '<h4 style="margin:8px 0 4px;font-size:13px;">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 style="margin:10px 0 4px;font-size:14px;">$1</h3>')
        .replace(/^# (.+)$/gm, '<h2 style="margin:12px 0 6px;font-size:15px;">$1</h2>')
        .replace(/^[-*] (.+)$/gm, '<li style="margin:2px 0;">$1</li>')
        .replace(/(<li.*<\/li>\n?)+/g, (m) => `<ul style="margin:4px 0 4px 16px;padding:0;">${m}</ul>`)
        .replace(/\n/g, '<br/>');

      return `
        <div style="margin-bottom:12px;padding:10px 14px;background:${bgColor};border-left:3px solid ${borderColor};border-radius:4px;">
          <div style="font-weight:600;font-size:11px;color:#555;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
          <div style="font-size:12px;line-height:1.6;color:#222;">${content}</div>
        </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #333; }
  </style>
</head>
<body>
  <div style="border-bottom:2px solid #1a73e8;padding-bottom:12px;margin-bottom:20px;">
    <h1 style="margin:0;font-size:18px;color:#1a73e8;">AI Clinical Assistant — Session Notes</h1>
    <div style="display:flex;gap:24px;margin-top:8px;font-size:12px;color:#666;">
      <span><strong>Date:</strong> ${now}</span>
      ${patientName ? `<span><strong>Patient:</strong> ${patientName}</span>` : ''}
    </div>
    ${conversationTitle ? `<div style="margin-top:4px;font-size:12px;color:#666;"><strong>Topic:</strong> ${conversationTitle}</div>` : ''}
  </div>

  <div style="margin-bottom:20px;padding:8px 12px;background:#fff3cd;border:1px solid #ffc107;border-radius:4px;font-size:11px;color:#856404;">
    ⚠️ AI-assisted clinical decision support only. All recommendations must be validated by the treating physician based on the individual patient's clinical context.
  </div>

  ${messagesHtml}

  <div style="margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#999;">
    Generated from DHOS AI Clinical Assistant · ${now} · For clinical reference only
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="padding:10px 24px;background:#1a73e8;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">
      Save as PDF / Print
    </button>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
