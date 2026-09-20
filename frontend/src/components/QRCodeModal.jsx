import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Printer, X, CheckCircle2, Copy } from 'lucide-react';

export const QRCodeModal = ({
  credentialId,
  degreeName,
  studentName,
  institutionName,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credentialId) return;

    let isMounted = true;
    QRCode.toDataURL(credentialId, {
      width: 320,
      margin: 2,
      color: {
        dark: '#211D1A',
        light: '#FAF8F4',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [credentialId]);

  const handleCopyId = () => {
    if (!credentialId) return;
    navigator.clipboard.writeText(credentialId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;

    const printWindow = window.open('', '_blank', 'width=650,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Verification Card - ${credentialId}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 24px;
              background-color: #F2EFE7;
              color: #211D1A;
            }
            .card {
              background: #FAF8F4;
              border: 1px solid rgba(92, 88, 80, 0.2);
              border-radius: 4px;
              padding: 36px 40px;
              max-width: 440px;
              text-align: center;
              box-shadow: none;
            }
            .header {
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 1px;
              color: #5C1F2E;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .title {
              font-family: 'Fraunces', Georgia, serif;
              font-size: 22px;
              font-weight: 500;
              margin: 0 0 6px 0;
            }
            .sub {
              font-size: 13px;
              color: #5C5850;
              margin: 0 0 20px 0;
            }
            .qr-img {
              width: 260px;
              height: 260px;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 8px;
              background: #ffffff;
              margin: 0 auto 16px auto;
              display: block;
            }
            .code-box {
              background: #f1f5f9;
              padding: 8px 14px;
              border-radius: 8px;
              font-family: monospace;
              font-size: 14px;
              font-weight: 600;
              letter-spacing: 0.5px;
              display: inline-block;
              margin-bottom: 14px;
            }
            .footer-note {
              font-size: 12px;
              color: #94a3b8;
              line-height: 1.4;
            }
            @media print {
              body { background: transparent; padding: 0; }
              .card { box-shadow: none; border-color: #cbd5e1; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">Decentralized Credential Anchor</div>
            <h1 class="title">${degreeName || 'Academic Credential'}</h1>
            <p class="sub">${studentName ? studentName + ' • ' : ''}${institutionName || 'Verified Institute'}</p>
            <img class="qr-img" src="${qrDataUrl}" alt="Credential QR Code" />
            <div class="code-box">${credentialId}</div>
            <p class="footer-note">
              Scan with any mobile camera or the Employer Verification Portal to instantly verify on-chain authenticity.
            </p>
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
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '440px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="flex-align" style={{ gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--divider)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
              }}
            >
              <QrCode size={18} />
            </div>
            <h3 className="modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
              Credential QR Code
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn-secondary btn-sm"
            style={{ padding: '0.35rem 0.5rem', borderRadius: '4px' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="modal-sub" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          Scan to verify this academic qualification instantly on the blockchain registry.
        </p>

        {/* QR Code Container */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '4px',
            padding: '1rem',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1px solid var(--divider)',
            margin: '0 auto 1.25rem auto',
          }}
        >
          {loading ? (
            <div style={{ width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              Generating high-resolution QR...
            </div>
          ) : (
            <img
              src={qrDataUrl}
              alt={`QR Code for ${credentialId}`}
              style={{ width: '240px', height: '240px', display: 'block' }}
              id="qr-code-image"
            />
          )}

          <div
            style={{
              marginTop: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--divider)',
              padding: '0.35rem 0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onClick={handleCopyId}
            title="Click to copy Credential ID"
          >
            <code style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.88rem', background: 'transparent', border: 'none', padding: 0 }}>
              {credentialId}
            </code>
            {copied ? (
              <CheckCircle2 size={14} className="text-success" />
            ) : (
              <Copy size={14} style={{ color: 'var(--text-secondary)' }} />
            )}
          </div>
        </div>

        {/* Credential Details Summary */}
        <div
          style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--divider)',
            borderRadius: '4px',
            padding: '0.85rem 1.1rem',
            marginBottom: '1.5rem',
            textAlign: 'left',
            fontSize: '0.85rem',
          }}
        >
          {degreeName && (
            <div style={{ marginBottom: '0.3rem', fontWeight: 500, fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              {degreeName}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>{studentName || 'Academic Graduate'}</span>
            <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>{institutionName || 'Verified Institution'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <a
            href={qrDataUrl}
            download={`${credentialId}-qr.png`}
            className="btn-primary flex-align"
            style={{ justifyContent: 'center', textDecoration: 'none' }}
            id="download-qr-btn"
          >
            <Download size={16} />
            <span>Download PNG</span>
          </a>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-secondary flex-align"
            style={{ justifyContent: 'center' }}
            id="print-qr-btn"
          >
            <Printer size={16} />
            <span>Print QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
