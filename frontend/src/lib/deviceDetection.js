/**
 * Device and WebGL capability detection for high-performance 3D rendering.
 * Provides early fallback to static SVG/canvas medallion on low-end or unsupported devices.
 */

export function isWebGLSupported() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return !!(gl && gl instanceof WebGLRenderingContext || (window.WebGL2RenderingContext && gl instanceof WebGL2RenderingContext));
  } catch (e) {
    return false;
  }
}

export function isLowEndDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // Reduced motion preference
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return true;
  }

  // Hardware concurrency check (<= 2 cores usually indicates low-end mobile/virtualized)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return true;
  }

  // Device memory check (if available, e.g., Chromium < 4GB)
  if (navigator.deviceMemory && navigator.deviceMemory < 4) {
    return true;
  }

  return false;
}

export function shouldUse3DHero() {
  return isWebGLSupported() && !isLowEndDevice();
}
