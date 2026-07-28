// QR Code Generator for ZeppOS Watch Face Installation

import QRCode from 'qrcode';

// Generate QR code for ZPK installation
export async function generateQRCode(zpkUrl: string): Promise<string> {
  // ZeppOS uses zpkd1:// protocol for watch face installation
  // Remove https:// if present, then wrap with zpkd1://
  const cleanUrl = zpkUrl.replace(/^https:\/\//, '').replace(/^http:\/\//, '');
  const zpkd1Url = `zpkd1://${cleanUrl}`;
  
  try {
    const dataUrl = await QRCode.toDataURL(zpkd1Url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });
    
    return dataUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Generate QR code with custom options
export async function generateQRCodeCustom(
  zpkUrl: string,
  options: {
    width?: number;
    darkColor?: string;
    lightColor?: string;
  } = {}
): Promise<string> {
  const { width = 400, darkColor = '#000000', lightColor = '#FFFFFF' } = options;
  const cleanUrl = zpkUrl.replace(/^https:\/\//, '').replace(/^http:\/\//, '');
  const zpkd1Url = `zpkd1://${cleanUrl}`;
  
  try {
    const dataUrl = await QRCode.toDataURL(zpkd1Url, {
      width,
      margin: 2,
      color: {
        dark: darkColor,
        light: lightColor,
      },
      errorCorrectionLevel: 'H',
    });
    
    return dataUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Download QR code as image
export function downloadQRCode(dataUrl: string, filename: string = 'watchface-qr.png') {
  try {
    console.log('[Download] Starting QR code download:', { filename });
    
    if (!dataUrl || dataUrl.length === 0) {
      throw new Error('QR code data URL is empty or invalid');
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    
    document.body.appendChild(a);
    console.log('[Download] QR code anchor element added to DOM');
    
    a.click();
    console.log('[Download] QR code download triggered');
    
    // Add small delay before cleanup to ensure download initiates
    setTimeout(() => {
      document.body.removeChild(a);
      console.log('[Download] QR code download cleanup complete');
    }, 100);
  } catch (error) {
    console.error('[Download] QR code download failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`QR code download failed: ${errorMessage}`);
  }
}
