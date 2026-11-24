import React, { useState } from 'react';
import { 
  Unlock, 
  Upload, 
  Key, 
  FileCheck, 
  Copy, 
  Check, 
  Download, 
  AlertTriangle, 
  Radio, 
  CheckCircle2,
  FileText
} from 'lucide-react';
import AudioWaveform from './AudioWaveform';

export default function DecodeTab() {
  const [stegoAudioFile, setStegoAudioFile] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);

  const [keyInputType, setKeyInputType] = useState('file'); // 'file' | 'hex'
  const [keyFile, setKeyFile] = useState(null);
  const [keyHex, setKeyHex] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [decryptedResult, setDecryptedResult] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  const handleAudioSelect = (file) => {
    if (!file) return;
    setStegoAudioFile(file);
    setAudioPreviewUrl(URL.createObjectURL(file));
    setDecryptedResult(null);
    setErrorMessage(null);
  };

  const handleExtract = async () => {
    if (!stegoAudioFile) {
      setErrorMessage("Please select a stego audio file (.wav or .mp3)");
      return;
    }
    if (keyInputType === 'file' && !keyFile) {
      setErrorMessage("Please upload your One-Time Pad (.key) file");
      return;
    }
    if (keyInputType === 'hex' && !keyHex.trim()) {
      setErrorMessage("Please paste the One-Time Pad Key Hex string");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setDecryptedResult(null);

    const formData = new FormData();
    formData.append('audio_file', stegoAudioFile);
    if (keyInputType === 'file') {
      formData.append('key_file', keyFile);
    } else {
      formData.append('key_hex', keyHex.trim());
    }

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Extraction failed');
      setDecryptedResult(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    if (!decryptedResult?.text_content) return;
    navigator.clipboard.writeText(decryptedResult.text_content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadDecryptedFile = () => {
    if (!decryptedResult?.payload_base64) return;
    const a = document.createElement('a');
    a.href = decryptedResult.payload_base64;
    a.download = decryptedResult.suggested_filename || 'decrypted_secret.bin';
    a.click();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyber-900 via-cyber-850 to-cyber-900 border border-cyber-800 shadow-xl">
        <div className="flex items-center gap-2 text-cyber-emerald text-sm font-mono font-semibold">
          <Unlock className="w-4 h-4" />
          <span>ZERO-RESIDUAL DECRYPTION ENGINE</span>
        </div>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl">
          Upload the carrier audio file and your matching One-Time Pad key. The engine reconstructs the key-dependent pseudo-random walk, isolates the encrypted bits, and performs inverse XOR decoding to restore the original plaintext.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Carrier Audio */}
        <div className="bg-cyber-900/90 border border-cyber-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-cyber-800 pb-3">
            <span className="w-6 h-6 rounded-full bg-cyber-emerald/20 text-cyber-emerald flex items-center justify-center font-mono text-xs font-bold">1</span>
            <h3 className="font-mono text-sm font-semibold text-slate-100 uppercase tracking-wider">
              Stego Audio Carrier (.wav / .mp3)
            </h3>
          </div>

          <label className="border-2 border-dashed border-cyber-800 hover:border-cyber-emerald/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-cyber-950/60 transition-colors group">
            <Upload className="w-8 h-8 text-slate-500 group-hover:text-cyber-emerald mb-2 transition-colors" />
            <span className="text-xs font-mono text-slate-300">
              {stegoAudioFile ? stegoAudioFile.name : 'Upload Stego Audio File (.wav or .mp3)'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 font-mono">
              Drag &amp; drop or click to select
            </span>
            <input
              type="file"
              accept=".wav,.mp3,audio/wav,audio/mpeg"
              onChange={(e) => handleAudioSelect(e.target.files?.[0])}
              className="hidden"
            />
          </label>

          {audioPreviewUrl && (
            <AudioWaveform audioUrl={audioPreviewUrl} label="Stego Audio Track" color="#00f5a0" />
          )}
        </div>

        {/* Step 2: Key Input */}
        <div className="bg-cyber-900/90 border border-cyber-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-cyber-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyber-accent/20 text-cyber-accent flex items-center justify-center font-mono text-xs font-bold">2</span>
              <h3 className="font-mono text-sm font-semibold text-slate-100 uppercase tracking-wider">
                One-Time Pad Key Package
              </h3>
            </div>
            {/* Input Type Toggle */}
            <div className="flex rounded-lg bg-cyber-950 p-1 border border-cyber-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setKeyInputType('file')}
                className={`px-3 py-1 rounded-md transition-all ${
                  keyInputType === 'file' 
                    ? 'bg-cyber-accent text-cyber-950 font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                .key File
              </button>
              <button
                type="button"
                onClick={() => setKeyInputType('hex')}
                className={`px-3 py-1 rounded-md transition-all ${
                  keyInputType === 'hex' 
                    ? 'bg-cyber-accent text-cyber-950 font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hex String
              </button>
            </div>
          </div>

          {keyInputType === 'file' ? (
            <div className="space-y-3">
              <label className="border-2 border-dashed border-cyber-800 hover:border-cyber-accent/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-cyber-950/60 transition-colors group">
                <Key className="w-8 h-8 text-slate-500 group-hover:text-cyber-accent mb-2 transition-colors" />
                <span className="text-xs font-mono text-slate-300">
                  {keyFile ? keyFile.name : 'Upload .key File'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 font-mono">
                  (Single-use OTP Key generated during embedding)
                </span>
                <input
                  type="file"
                  accept=".key,application/octet-stream"
                  onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {keyFile && (
                <div className="flex justify-between items-center text-xs font-mono text-slate-400 bg-cyber-950 p-2.5 rounded-lg border border-cyber-800">
                  <span>Key Package: <strong className="text-slate-200">{keyFile.name}</strong></span>
                  <span>Size: <strong className="text-cyber-accent">{keyFile.size} bytes</strong></span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={keyHex}
                onChange={(e) => setKeyHex(e.target.value)}
                placeholder="Paste the hex-encoded OTP key string here..."
                rows={5}
                className="w-full bg-cyber-950 border border-cyber-800 rounded-xl p-3.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyber-accent transition-colors resize-none break-all"
              />
              <div className="text-[11px] font-mono text-slate-500">
                Format: 32 bytes PRW seed + 4 bytes length key + payload OTP bytes.
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-cyber-950 border border-cyber-800 text-[11px] font-mono text-slate-400">
            🔒 <strong>Verification Guarantee:</strong> If the key does not match this specific audio file, extraction fails mathematically with zero possibility of false decryptions.
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-cyber-danger/10 border border-cyber-danger/30 text-cyber-danger text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Extract Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleExtract}
          disabled={isProcessing || !stegoAudioFile || (keyInputType === 'file' ? !keyFile : !keyHex.trim())}
          className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyber-emerald to-teal-400 text-cyber-950 font-mono font-bold text-sm tracking-wider uppercase shadow-lg shadow-cyber-emerald/25 hover:shadow-cyber-emerald/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Radio className="w-4 h-4 animate-spin" />
              <span>Extracting &amp; Decrypting with OTP...</span>
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4" />
              <span>Extract &amp; Decrypt Hidden Payload</span>
            </>
          )}
        </button>
      </div>

      {/* Decrypted Output Section */}
      {decryptedResult && (
        <div className="bg-cyber-900 border border-cyber-emerald/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-fadeIn glow-emerald">
          <div className="flex items-center justify-between border-b border-cyber-800 pb-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-cyber-emerald" />
              <div>
                <h3 className="font-mono text-base font-bold text-slate-100">
                  Secret Extracted &amp; Decrypted Successfully
                </h3>
                <p className="text-xs text-slate-400">
                  Carrier: {decryptedResult.format} • Size: {decryptedResult.payload_length_bytes} bytes • 100% Bit-Exact Recovery
                </p>
              </div>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30 font-semibold">
              AUTHENTICATED
            </span>
          </div>

          {decryptedResult.is_text ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>Decrypted Plaintext:</span>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyber-800 hover:bg-cyber-700 text-cyber-accent font-semibold transition-all"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
              <div className="p-4 rounded-xl bg-cyber-950 border border-cyber-800 font-mono text-sm text-slate-100 break-words whitespace-pre-wrap selection:bg-cyber-emerald selection:text-cyber-950">
                {decryptedResult.text_content}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-cyber-950 border border-cyber-800 text-center space-y-4">
              <FileText className="w-12 h-12 text-cyber-accent mx-auto" />
              <div>
                <h4 className="font-mono text-sm font-bold text-slate-200">
                  {decryptedResult.file_description || 'Binary File'} Decrypted
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Payload size: {decryptedResult.payload_length_bytes} bytes
                  {decryptedResult.detected_extension && decryptedResult.detected_extension !== 'bin' && (
                    <span> &bull; Detected format: <strong className="text-cyber-accent uppercase font-mono">.{decryptedResult.detected_extension}</strong></span>
                  )}
                </p>
              </div>
              <button
                onClick={handleDownloadDecryptedFile}
                className="px-6 py-2.5 rounded-xl bg-cyber-emerald text-cyber-950 font-mono font-bold text-xs hover:bg-emerald-400 transition-all inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download {decryptedResult.suggested_filename || 'Decrypted File'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
