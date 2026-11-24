# CipherLoom // Information-Theoretic Steganographic Audio Engine

**CipherLoom** is a web-based cryptographic audio steganography suite that combines **True One-Time Pad (OTP) encryption** with **statistically undetectable steganography** in both `.wav` and `.mp3` audio formats.

---

## Key Features

1. **Information-Theoretic Perfect Secrecy (Shannon's Theorem)**:
   - Plaintext messages and binary files are encrypted using hardware cryptographic entropy (`os.urandom` CSPRNG).
   - The ciphertext has maximal Shannon entropy (8.000 bits/byte), rendering every bit indistinguishable from thermal/quantization noise.
   - Keys are generated with exact matching length and strictly enforced as single-use.

2. **Steganalysis-Resistant Audio Embedding**:
   - **Zero Plaintext Signatures**: No magic bytes, no static headers (e.g. `AUDIO_STEGO_...`), and no delimiter markers. Even the 4-byte payload length is encrypted with independent OTP keys.
   - **Key-Derived Pseudo-Random Walk (PRW)**: Bits are scattered non-sequentially across the carrier according to an HMAC-SHA256 PRNG keyed by the OTP key's 32-byte seed. An observer without the key cannot find the start, end, or sequence of modified bits.
   - **Lossless WAV Engine**: Employs dynamic amplitude masking on 16-bit PCM samples ($|S| \ge 10$) to preserve silence and avoid elevating the acoustic noise floor, delivering SNR $> 100\text{ dB}$ and passing Chi-Square ($\chi^2$) hypothesis testing ($p > 0.05$).
   - **Lossy MP3 Engine**: Uses ISO/IEC 11172-3 standardized frame private channels and side-information bits. Outputs a 100% valid MP3 bitstream that plays in any browser or media player with zero warnings or acoustic distortion.

3. **Modern Web Dashboard**:
   - **Interactive Waveform Player**: Powered by WaveSurfer.js with real-time audio playback, scrub, zoom, and timecodes.
   - **1-Click Sample Audio**: Instantly load synthesized high-fidelity test WAV or MP3 audio tracks for testing.
   - **Safe Capacity Meter**: Live inspection of carrier format, sample rate, channels, and maximum safe steganographic bytes.
   - **Steganalysis Lab**: Live comparative Chi-Square testing, SNR/PSNR calculation, and Shannon entropy monitoring.

---

## Architecture

```
                                  [ Plaintext Message / Secret File ]
                                                   │
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  Stage 1: True One-Time Pad Cryptographic Engine                                       │
│  - Generates 32B PRW Seed + 4B Length Key + L-Byte Payload Key                         │
│  - Shannon Perfect Secrecy: C = P ⊕ K  (Entropy: 8.000 bits/byte)                      │
└──────────────────────────────────┬─────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  Stage 2: Key-Derived Pseudo-Random Walk (PRW) Embedding                               │
│                                                                                        │
│   WAV Mode:                                 MP3 Mode:                                  │
│   • Dynamic range filtering (|S| >= 10)     • MPEG Layer III frame parsing             │
│   • 16-bit PCM LSB modification             • Standardized header & side-info bits     │
│   • SNR > 100 dB, PSNR > 120 dB             • Zero decoding glitches / warnings        │
└──────────────────────────────────┬─────────────────────────────────────────────────────┘
                                   │
                                   ▼
           [ Stego Audio (.wav / .mp3) ]   +   [ One-Time Pad Key (.key) ]
```

---

## Quick Start

### 1. Launch with the Unified Runner Script

```bash
chmod +x run.sh
./run.sh
```

- **Web Dashboard**: `http://localhost:3000` (or `http://localhost:8000`)
- **FastAPI API**: `http://localhost:8000/docs`

### 2. Manual Startup

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev -- --port 3000
```

---

## API Endpoints

- `GET /api/health` — Service health and supported algorithms.
- `GET /api/sample-audio/{format}` — Download 4-second harmonic sample audio (`wav` or `mp3`).
- `POST /api/analyze-audio` — Inspect uploaded audio and compute safe stealth capacity.
- `POST /api/embed` — Encrypt secret with True OTP and embed into audio carrier.
- `POST /api/extract` — Extract and decrypt hidden payload using the OTP key.
- `POST /api/steganalysis` — Run comparative Chi-Square, SNR, and entropy analysis.
