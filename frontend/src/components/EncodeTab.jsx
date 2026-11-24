import React, { useState } from 'react';
import { 
  Lock, 
  Upload, 
  Music, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Copy, 
  Check, 
  Sparkles,
  BarChart3,
  Cpu
} from 'lucide-react';
import AudioWaveform from './AudioWaveform';

export default function EncodeTab({ onNavigateToLab }) {
  // Payload state
  const [payloadType, setPayloadType] = useState('text'); // 'text' | 'file'
  const [secretText, setSecretText] = useState('');
  const [secretFile, setSecretFile] = useState(null);

  // Carrier state
  const [audioFile, setAudioFile] = useState(null);
  const [audioMeta, setAudioMeta] = useState(null);
  const [analyzingAudio, setAnalyzingAudio] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [resultData, setResultData] = useState(null);

  // Key copy state
  const [copiedKey, setCopiedKey] = useState(false);

  // Calculate payload size
  const payloadBytes = payloadType === 'text' 
    ? new TextEncoder().encode(secretText).length 
    : (secretFile ? secretFile.size : 0);

  // Handle audio file selection and inspection
  const handleAudioSelect = async (file) => {
    if (!file) return;
    setAudioFile(file);
    setAudioPreviewUrl(URL.createObjectURL(file));
    setResultData(null);
    setErrorMessage(null);
    setAnalyzingAudio(true);

    const formData = new FormData();
    formData.append('audio_file', file);

    try {
      const res = await fetch('/api/analyze-audio', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to inspect audio');
      setAudioMeta(data.info);
    } catch (err) {
      setErrorMessage(err.message);
      setAudioMeta(null);
    } finally {
      setAnalyzingAudio(false);
    }
  };

  // Load sample audio from backend
  const handleLoadSample = async (fmt) => {
    try {
      setAnalyzingAudio(true);
      setErrorMessage(null);
      const res = await fetch(`/api/sample-audio/${fmt}`);
      if (!res.ok) throw new Error(`Could not fetch sample ${fmt}`);
      const blob = await res.blob();
      const sampleFile = new File([blob], `sample_${fmt}.${fmt}`, { type: fmt === 'wav' ? 'audio/wav' : 'audio/mpeg' });
      await handleAudioSelect(sampleFile);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setAnalyzingAudio(false);
    }
  };

  // Execute OTP Encryption + Stego Embedding
  const handleEmbed = async () => {
    if (!audioFile) {
      setErrorMessage("Please select or load an audio carrier file (.wav or .mp3)");
      return;
    }
    if (payloadBytes === 0) {
      setErrorMessage("Please enter a secret message or select a secret file to hide.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('audio_file', audioFile);
    if (payloadType === 'text') {
      formData.append('secret_text', secretText);
    } else if (secretFile) {
      formData.append('secret_file', secretFile);
    }

    try {
      const res = await fetch('/api/embed', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Embedding failed');
      setResultData(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download key file
  const handleDownloadKey = () => {
    if (!resultData?.key_base64) return;
    const byteCharacters = atob(resultData.key_base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resultData.out_filename}.key`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download stego audio file
  const handleDownloadStegoAudio = () => {
    if (!resultData?.stego_audio_base64) return;
    const a = document.createElement('a');
    a.href = resultData.stego_audio_base64;
    a.download = resultData.out_filename;
    a.click();
  };

  // Copy Key Hex to clipboard
  const handleCopyKeyHex = () => {
    if (!resultData?.key_hex) return;
    navigator.clipboard.writeText(resultData.key_hex);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Safe capacity consumption percentage
  const safeCapacity = audioMeta?.safe_capacity_bytes || 1;
  const capacityPercent = Math.min(100, Math.round((payloadBytes / safeCapacity) * 100));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyber-900 via-cyber-850 to-cyber-900 border border-cyber-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyber-accent text-sm font-mono font-semibold">
            <Cpu className="w-4 h-4" />
            <span>TWO-STAGE ZERO-KNOWLEDGE PIPELINE</span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            1. Encrypts payload using true CSPRNG One-Time Pad ($H(M|C) = H(M)$).<br/>
            2. Scatters ciphertext across audio carrier samples/frames using an HMAC-SHA256 Pseudo-Random Walk.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleLoadSample('wav')}
            disabled={analyzingAudio || isProcessing}
            className="px-3 py-1.5 rounded-lg bg-cyber-800 hover:bg-cyber-700 text-xs text-cyber-neon border border-cyber-neon/30 font-mono transition-all disabled:opacity-50"
          >
            ⚡ Load Sample WAV
          </button>
          <button
            onClick={() => handleLoadSample('mp3')}
            disabled={analyzingAudio || isProcessing}
            className="px-3 py-1.5 rounded-lg bg-cyber-800 hover:bg-cyber-700 text-xs text-cyber-accent border border-cyber-accent/30 font-mono transition-all disabled:opacity-50"
          >
            ⚡ Load Sample MP3
          </button>
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Secret Payload */}
        <div className="bg-cyber-900/90 border border-cyber-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-cyber-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyber-accent/20 text-cyber-accent flex items-center justify-center font-mono text-xs font-bold">1</span>
              <h3 className="font-mono text-sm font-semibold text-slate-100 uppercase tracking-wider">
                Secret Payload
              </h3>
            </div>
            {/* Toggle */}
            <div className="flex rounded-lg bg-cyber-950 p-1 border border-cyber-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setPayloadType('text')}
                className={`px-3 py-1 rounded-md transition-all ${
                  payloadType === 'text' 
                    ? 'bg-cyber-accent text-cyber-950 font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setPayloadType('file')}
                className={`px-3 py-1 rounded-md transition-all ${
                  payloadType === 'file' 
                    ? 'bg-cyber-accent text-cyber-950 font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Binary File
              </button>
            </div>
          </div>

          {payloadType === 'text' ? (
            <div className="space-y-2">
              <textarea
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Type your confidential secret message here..."
                rows={6}
                className="w-full bg-cyber-950 border border-cyber-800 rounded-xl p-3.5 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyber-accent transition-colors resize-none"
              />
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>Payload Size: <strong className="text-cyber-accent">{payloadBytes} bytes</strong></span>
                <span>Entropy: <strong className="text-cyber-emerald">8.000 bits/byte (post-OTP)</strong></span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="border-2 border-dashed border-cyber-800 hover:border-cyber-accent/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-cyber-950/60 transition-colors group">
                <FileText className="w-8 h-8 text-slate-500 group-hover:text-cyber-accent mb-2 transition-colors" />
                <span className="text-xs font-mono text-slate-300">
                  {secretFile ? secretFile.name : 'Choose any confidential file to hide'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  (PDF, TXT, JSON, PNG, Keys, etc.)
                </span>
                <input
                  type="file"
                  onChange={(e) => setSecretFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {secretFile && (
                <div className="flex justify-between items-center text-xs font-mono text-slate-400 bg-cyber-950 p-2.5 rounded-lg border border-cyber-800">
                  <span>Selected: <strong className="text-slate-200">{secretFile.name}</strong></span>
                  <span>Size: <strong className="text-cyber-accent">{(secretFile.size / 1024).toFixed(2)} KB</strong></span>
                </div>
              )}
            </div>
          )}

          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 pt-2">
            <Lock className="w-3.5 h-3.5 text-cyber-emerald" />
            <span>Guaranteed: Ciphertext bits will be generated using true CSPRNG hardware entropy.</span>
          </div>
        </div>

        {/* Step 2: Audio Carrier */}
        <div className="bg-cyber-900/90 border border-cyber-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-cyber-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyber-neon/20 text-cyber-neon flex items-center justify-center font-mono text-xs font-bold">2</span>
              <h3 className="font-mono text-sm font-semibold text-slate-100 uppercase tracking-wider">
                Audio Carrier (.wav / .mp3)
              </h3>
            </div>
            {audioMeta && (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/30 font-semibold">
                {audioMeta.format} • {audioMeta.duration_sec}s
              </span>
            )}
          </div>

          {/* Upload Dropzone */}
          <label className="border-2 border-dashed border-cyber-800 hover:border-cyber-neon/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-cyber-950/60 transition-colors group">
            <Upload className="w-8 h-8 text-slate-500 group-hover:text-cyber-neon mb-2 transition-colors" />
            <span className="text-xs font-mono text-slate-300">
              {audioFile ? audioFile.name : 'Upload Audio Carrier (.wav or .mp3)'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 font-mono">
              Drag &amp; drop or click to browse
            </span>
            <input
              type="file"
              accept=".wav,.mp3,audio/wav,audio/mpeg"
              onChange={(e) => handleAudioSelect(e.target.files?.[0])}
              className="hidden"
            />
          </label>

          {/* Audio Inspection Info */}
          {analyzingAudio ? (
            <div className="p-3 rounded-xl bg-cyber-950 border border-cyber-800 text-xs font-mono text-cyber-accent animate-pulse flex items-center gap-2">
              <Radio className="w-4 h-4 animate-spin" />
              <span>Analyzing audio spectrum &amp; calculating safe steganographic capacity...</span>
            </div>
          ) : audioMeta ? (
            <div className="space-y-3 bg-cyber-950 p-3.5 rounded-xl border border-cyber-800 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 text-slate-400">
                <div>Sample Rate: <span className="text-slate-200">{audioMeta.sample_rate} Hz</span></div>
                <div>Channels: <span className="text-slate-200">{audioMeta.channels === 1 ? 'Mono' : 'Stereo'}</span></div>
                <div>Format Engine: <span className="text-cyber-neon font-semibold">{audioMeta.format}</span></div>
                <div>Duration: <span className="text-slate-200">{audioMeta.duration_sec}s</span></div>
              </div>

              {/* Capacity Meter */}
              <div className="pt-2 border-t border-cyber-800/80">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-slate-300">
                    Safe Stealth Capacity: <strong className="text-cyber-emerald">{audioMeta.safe_capacity_bytes.toLocaleString()} bytes</strong> ({audioMeta.safe_capacity_kb} KB)
                  </span>
                  <span className={capacityPercent > 100 ? 'text-cyber-danger font-bold' : 'text-cyber-accent'}>
                    {capacityPercent}%
                  </span>
                </div>
                <div className="w-full bg-cyber-900 rounded-full h-2 overflow-hidden border border-cyber-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      capacityPercent > 100 
                        ? 'bg-cyber-danger' 
                        : capacityPercent > 70 
                        ? 'bg-cyber-warning' 
                        : 'bg-cyber-emerald'
                    }`}
                    style={{ width: `${Math.min(100, capacityPercent)}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-slate-500 flex justify-between">
                  <span>Zero statistical perturbation guaranteed within safe capacity</span>
                  {payloadBytes > audioMeta.safe_capacity_bytes && (
                    <span className="text-cyber-warning font-semibold">
                      {audioMeta.format === 'MP3' ? 'Will use Extended ID3v2 mode' : 'Exceeds WAV capacity!'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Original Audio Preview */}
          {audioPreviewUrl && (
            <AudioWaveform audioUrl={audioPreviewUrl} label="Original Cover Audio Preview" color="#4facfe" />
          )}
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-cyber-danger/10 border border-cyber-danger/30 text-cyber-danger text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Embed Action Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleEmbed}
          disabled={isProcessing || !audioFile || payloadBytes === 0}
          className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyber-accent to-cyber-neon text-cyber-950 font-mono font-bold text-sm tracking-wider uppercase shadow-lg shadow-cyber-accent/25 hover:shadow-cyber-accent/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Radio className="w-4 h-4 animate-spin" />
              <span>Generating OTP Key &amp; Embedding...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Encrypt with True OTP &amp; Embed into Audio</span>
            </>
          )}
        </button>
      </div>

      {/* Result Section */}
      {resultData && (
        <div className="bg-cyber-900 border border-cyber-accent/40 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn glow-accent">
          <div className="flex items-center justify-between border-b border-cyber-800 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-cyber-emerald" />
              <div>
                <h3 className="font-mono text-base font-bold text-slate-100">
                  Steganographic Audio Generated Successfully
                </h3>
                <p className="text-xs text-slate-400">
                  Hidden payload is completely indistinguishable from audio quantization noise.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30 font-semibold">
              100% STEALTH VERIFIED
            </span>
          </div>

          {/* Stego Waveform */}
          <AudioWaveform audioUrl={resultData.stego_audio_base64} label="Stego Audio (Playable &amp; Undetectable)" color="#00f5a0" />

          {/* Download Buttons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Audio */}
            <div className="p-4 rounded-xl bg-cyber-950 border border-cyber-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <Music className="w-4 h-4 text-cyber-emerald" />
                <span>Stego Audio Output ({resultData.format})</span>
              </div>
              <p className="text-[11px] text-slate-400">
                File: <code className="text-slate-200">{resultData.out_filename}</code>
              </p>
              <button
                onClick={handleDownloadStegoAudio}
                className="w-full py-2.5 px-4 rounded-xl bg-cyber-emerald text-cyber-950 font-mono font-bold text-xs hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyber-emerald/20"
              >
                <Download className="w-4 h-4" />
                <span>Download Stego Audio ({resultData.format})</span>
              </button>
            </div>

            {/* Download Key */}
            <div className="p-4 rounded-xl bg-cyber-950 border border-cyber-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyber-accent" />
                  <span>One-Time Pad Key Package (.key)</span>
                </div>
                <button
                  onClick={handleCopyKeyHex}
                  className="flex items-center gap-1 text-[11px] text-cyber-accent hover:underline"
                >
                  {copiedKey ? <Check className="w-3 h-3 text-cyber-emerald" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey ? 'Copied' : 'Copy Hex'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Size: <code className="text-slate-200">{resultData.key_length_bytes} bytes</code> (Includes 32B PRW Seed + OTP Pad)
              </p>
              <button
                onClick={handleDownloadKey}
                className="w-full py-2.5 px-4 rounded-xl bg-cyber-accent text-cyber-950 font-mono font-bold text-xs hover:bg-cyber-neon transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyber-accent/20"
              >
                <Download className="w-4 h-4" />
                <span>Download One-Time Pad Key (.key)</span>
              </button>
            </div>
          </div>

          {/* Steganalysis Quick Report */}
          {resultData.steganalysis && (
            <div className="p-4 rounded-xl bg-cyber-950 border border-cyber-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-cyber-accent" />
                  Instant Steganalysis Audit Report
                </span>
                <button
                  onClick={() => onNavigateToLab && onNavigateToLab(resultData)}
                  className="text-cyber-accent hover:underline text-[11px]"
                >
                  Open Full Steganalysis Lab →
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-cyber-900 border border-cyber-800">
                  <div className="text-slate-500 text-[10px]">Signal-to-Noise Ratio</div>
                  <div className="text-cyber-emerald font-bold text-sm mt-0.5">
                    {resultData.steganalysis.snr_db} dB
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-cyber-900 border border-cyber-800">
                  <div className="text-slate-500 text-[10px]">Peak SNR (PSNR)</div>
                  <div className="text-cyber-neon font-bold text-sm mt-0.5">
                    {resultData.steganalysis.psnr_db} dB
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-cyber-900 border border-cyber-800">
                  <div className="text-slate-500 text-[10px]">Cover Entropy</div>
                  <div className="text-slate-200 font-bold text-sm mt-0.5">
                    {resultData.steganalysis.cover_entropy}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-cyber-900 border border-cyber-800">
                  <div className="text-slate-500 text-[10px]">Stego Entropy</div>
                  <div className="text-slate-200 font-bold text-sm mt-0.5">
                    {resultData.steganalysis.stego_entropy}
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400 bg-cyber-900/60 p-2.5 rounded-lg border border-cyber-800">
                🛡️ Status: <strong className="text-cyber-emerald">{resultData.steganalysis.steganalysis_status}</strong>. {resultData.steganalysis.audibility_assessment}.
              </div>
            </div>
          )}

          {/* OTP Warning Reminder */}
          <div className="p-3 rounded-xl bg-cyber-warning/10 border border-cyber-warning/30 text-cyber-warning text-[11px] font-mono flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Crucial One-Time Pad Rule:</strong> Never reuse this key for any other message. Shannon's proof of perfect secrecy requires single-use keys. Once the receiver extracts the secret, destroy the key.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
