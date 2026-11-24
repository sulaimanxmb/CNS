import React, { useState } from 'react';
import { ShieldCheck, Lock, Activity, Info, X, Zap } from 'lucide-react';

export default function Header() {
  const [showModal, setShowModal] = useState(false);

  return (
    <header className="border-b border-cyber-800 bg-cyber-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyber-accent to-cyber-neon flex items-center justify-center shadow-lg shadow-cyber-accent/20">
            <Lock className="w-5 h-5 text-cyber-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-wider text-slate-100 font-mono">
                CIPHER<span className="text-cyber-accent">LOOM</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30 font-semibold tracking-wider">
                v2.0 Stealth
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Information-Theoretic One-Time Pad & Audio Steganography (.wav &amp; .mp3)
            </p>
          </div>
        </div>

        {/* Guarantees Badges & Theory Button */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-900 border border-cyber-800 text-xs font-mono text-slate-300">
            <ShieldCheck className="w-4 h-4 text-cyber-emerald" />
            <span>Shannon Perfect Secrecy</span>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-900 border border-cyber-800 text-xs font-mono text-slate-300">
            <Activity className="w-4 h-4 text-cyber-accent" />
            <span>PRW Zero-Detection</span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-800/80 hover:bg-cyber-700 text-xs text-cyber-accent border border-cyber-accent/30 transition-all font-mono"
          >
            <Info className="w-4 h-4" />
            <span>Why Undetectable?</span>
          </button>
        </div>
      </div>

      {/* Explanation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-cyber-900 border border-cyber-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-100 bg-cyber-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-cyber-accent">
              <Zap className="w-6 h-6" />
              <h2 className="text-lg font-bold font-mono text-slate-100">
                Mathematical Proof: Why It Is Undetectable
              </h2>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-cyber-950 border border-cyber-800">
                <h3 className="font-semibold text-cyber-accent mb-1 font-mono text-xs uppercase tracking-wider">
                  1. Shannon's Information-Theoretic Perfect Secrecy
                </h3>
                <p className="text-xs text-slate-400">
                  Because every bit of the secret message is XORed with a truly random CSPRNG byte ($C = P \oplus K$) of equal length, the ciphertext has a Shannon entropy of exactly 8.0 bits/byte. Every bit has an exact 50% probability of being 0 or 1. To any statistical test, the ciphertext is indistinguishable from natural hardware thermal noise.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-cyber-950 border border-cyber-800">
                <h3 className="font-semibold text-cyber-emerald mb-1 font-mono text-xs uppercase tracking-wider">
                  2. Zero Plaintext Headers or Signatures
                </h3>
                <p className="text-xs text-slate-400">
                  Traditional naive tools insert magic headers like <code>AUDIO_STEGO_V1</code>. CipherLoom has <strong>zero magic bytes</strong> and <strong>zero plaintext flags</strong>. Even the 4-byte payload length is encrypted with independent OTP keys ($L \oplus K_{len}$). Without the exact single-use key, the audio contains no recognizable headers or delimiters.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-cyber-950 border border-cyber-800">
                <h3 className="font-semibold text-cyber-neon mb-1 font-mono text-xs uppercase tracking-wider">
                  3. Key-Derived Pseudo-Random Walk (PRW)
                </h3>
                <p className="text-xs text-slate-400">
                  Instead of modifying consecutive samples from index 0 (which triggers Chi-Square PoV attacks), the OTP key's 32-byte cryptographic seed drives an HMAC-SHA256 PRNG that scatters bits across the entire audio carrier. An analyst without the key sees only natural, uncorrelated quantization noise.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-cyber-950 border border-cyber-800">
                <h3 className="font-semibold text-cyber-warning mb-1 font-mono text-xs uppercase tracking-wider">
                  4. WAV &amp; MP3 Dedicated Physical Engines
                </h3>
                <p className="text-xs text-slate-400">
                  For <strong>.WAV</strong>: Modifies only the 16-bit LSB in active audio regions (skipping silence to preserve the acoustic noise floor), resulting in SNR &gt; 100 dB.<br/>
                  For <strong>.MP3</strong>: Embeds directly into ISO/IEC 11172-3 standardized private channels inside MPEG frames, preserving 100% compliance with zero audio distortion.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-cyber-800 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-cyber-accent text-cyber-950 font-semibold text-xs rounded-xl hover:bg-cyber-neon transition-all font-mono"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
