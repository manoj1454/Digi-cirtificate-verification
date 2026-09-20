import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Camera, Upload, X, AlertCircle, RefreshCw } from 'lucide-react';

export const QRScannerModal = ({ onScan, onClose }) => {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload'
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const html5QrCodeRef = useRef(null);

  // Helper to extract Credential ID from decoded string
  const cleanCredentialId = (rawText) => {
    if (!rawText) return '';
    const trimmed = rawText.trim();
    // Match CRED-... pattern if full URL or text was provided
    const match = trimmed.match(/CRED-[A-Za-z0-9_-]+/i);
    return match ? match[0].toUpperCase() : trimmed;
  };

  const handleScanSuccess = (decodedText) => {
    const credentialId = cleanCredentialId(decodedText);
    stopScanner();
    onScan(credentialId);
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        // Ignore stop error if already stopped
      }
      try {
        await html5QrCodeRef.current.clear();
      } catch (e) {}
      setIsScanning(false);
    }
  };

  // Start live camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Parsing frame errors are normal while searching
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.warn('Camera start error:', err);
      setCameraError(
        'Could not access device camera. Please check permissions or switch to the "Upload QR Image" tab below.'
      );
      setIsScanning(false);
    }
  };

  // Handle switching tabs
  useEffect(() => {
    if (activeTab === 'camera') {
      // Small timeout to ensure DOM container #qr-reader is mounted
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [activeTab]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Handle File Upload Scan
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    try {
      const html5QrCode = html5QrCodeRef.current || new Html5Qrcode('qr-reader-hidden');
      html5QrCodeRef.current = html5QrCode;

      const decodedText = await html5QrCode.scanFile(file, true);
      setIsProcessingFile(false);
      handleScanSuccess(decodedText);
    } catch (err) {
      setIsProcessingFile(false);
      setCameraError('No valid Credential QR code found in this image. Please try another image.');
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '480px', textAlign: 'center', padding: '1.75rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
              Scan Credential QR Code
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="btn-secondary btn-sm"
            style={{ padding: '0.35rem 0.5rem', borderRadius: '4px' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            background: 'var(--surface-subtle)',
            padding: '3px',
            borderRadius: '4px',
            marginBottom: '1.25rem',
            border: '1px solid var(--divider)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '3px',
              border: 'none',
              background: activeTab === 'camera' ? 'var(--text-primary)' : 'transparent',
              color: activeTab === 'camera' ? 'var(--bg)' : 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            <Camera size={15} />
            <span>Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '3px',
              border: 'none',
              background: activeTab === 'upload' ? 'var(--text-primary)' : 'transparent',
              color: activeTab === 'upload' ? 'var(--bg)' : 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            <Upload size={15} />
            <span>Upload QR Image</span>
          </button>
        </div>

        {/* Error Notification */}
        {cameraError && (
          <div
            className="alert-box alert-error"
            style={{ marginBottom: '1rem', textAlign: 'left', fontSize: '0.85rem' }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Tab 1: Camera Scanner */}
        {activeTab === 'camera' && (
          <div>
            <div
              id="qr-reader"
              style={{
                width: '100%',
                maxWidth: '360px',
                minHeight: '280px',
                margin: '0 auto',
                borderRadius: '4px',
                overflow: 'hidden',
                background: '#FAF8F4',
                border: '1px solid var(--divider)',
                position: 'relative',
              }}
            />
            <p className="modal-sub" style={{ marginTop: '0.75rem', fontSize: '0.82rem' }}>
              Hold the applicant's Credential QR code in front of the camera to verify automatically.
            </p>
          </div>
        )}

        {/* Tab 2: Upload Image */}
        {activeTab === 'upload' && (
          <div
            style={{
              padding: '2rem 1.5rem',
              border: '1px dashed var(--divider)',
              borderRadius: '4px',
              background: 'var(--surface-subtle)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(92, 31, 46, 0.08)',
                border: '1px solid rgba(92, 31, 46, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
                color: 'var(--accent-primary)',
              }}
            >
              <Upload size={20} />
            </div>

            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
              Select QR Code Image
            </h4>
            <p className="text-muted text-sm" style={{ marginBottom: '1.25rem' }}>
              Upload a PNG, JPG, or screenshot containing the certificate QR code.
            </p>

            <label
              className="btn-primary flex-align"
              style={{ display: 'inline-flex', cursor: 'pointer', padding: '0.6rem 1.25rem' }}
            >
              <span>{isProcessingFile ? 'Decoding Image...' : 'Browse QR File'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={isProcessingFile}
              />
            </label>
          </div>
        )}

        <div id="qr-reader-hidden" style={{ display: 'none' }}></div>
      </div>
    </div>
  );
};
