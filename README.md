# CipherLoom // Audio Steganography & True OTP Engine

CipherLoom is an information-theoretically secure audio steganography suite. It encrypts payloads with **True One-Time Pad (OTP)** and hides ciphertext into **.wav** and **.mp3** audio files using **Key-Derived Pseudo-Random Walk (PRW)**, leaving zero signatures and zero audible distortion.

---

## Prerequisites

Before starting, ensure your system has the following installed:

* **Python**: `3.10+` (tested on Python 3.11 / 3.14)
* **Node.js**: `v18.0+` or `v20.0+` & `npm`
* **FFmpeg**: Required for audio transcoding and stream parsing (`ffmpeg` on PATH)
  * *Ubuntu/Debian*: `sudo apt-get install ffmpeg`
  * *Arch Linux*: `sudo pacman -S ffmpeg`
  * *macOS*: `brew install ffmpeg`

---

## Step-by-Step Recreation & Setup Process

Follow these steps to recreate and run the complete project from scratch.

### 1. Clone the Repository

```bash
git clone https://github.com/sulaimaneksambi/CipherLoom.git
cd CipherLoom
```

---

### 2. Backend Recreation (Python + FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a clean Python virtual environment:
   ```bash
   python3 -m venv venv
   ```

3. Activate the virtual environment:
   * **Linux / macOS**:
     ```bash
     source venv/bin/activate
     ```
   * **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```

4. Install the required backend dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
   *(Dependencies: `fastapi`, `uvicorn[standard]`, `python-multipart`, `numpy`, `scipy`, `pydub`)*

5. Return to the project root:
   ```bash
   cd ..
   ```

---

### 3. Frontend Recreation (React + Vite + Tailwind CSS)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install all npm dependencies:
   ```bash
   npm install
   ```
   *(Dependencies: `react`, `react-dom`, `lucide-react`, `wavesurfer.js`, `tailwindcss`, `vite`)*

3. (Optional) Build production static assets:
   ```bash
   npm run build
   ```

4. Return to the project root:
   ```bash
   cd ..
   ```

---

### 4. Running the Application

You can start both the backend and frontend simultaneously with the unified runner script or manually in separate terminals.

#### Option A: One-Command Startup (Recommended)

Make `run.sh` executable and run it:

```bash
chmod +x run.sh
./run.sh
```

This starts:
* **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
* **FastAPI Backend & API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

#### Option B: Manual Startup (Two Terminals)

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 3000
```

Open your browser at **`http://localhost:3000`**.

---

## Recreation Verification & Testing

To verify that the cryptographic and steganographic engines are fully functional after setup, run the built-in test suite:

```bash
cd backend
source venv/bin/activate
python -c "
from app.otp import otp_encrypt, otp_decrypt
from app.stego_wav import embed_in_wav, extract_from_wav
from app.stego_mp3 import embed_in_mp3, extract_from_mp3

# Verify OTP
msg = b'CipherLoom Verification Test'
otp = otp_encrypt(msg)
assert otp_decrypt(otp['key_bytes'], otp['ciphertext_bytes']) == msg
print('✓ OTP Engine: OK')
"
```

---

## Project Structure

```
CipherLoom/
├── run.sh                          # Unified startup script
├── .gitignore                      # Excludes venv, node_modules, keys, and temp files
├── README.md                       # Setup and recreation guide
│
├── backend/
│   ├── requirements.txt            # Python dependencies
│   └── app/
│       ├── __init__.py
│       ├── main.py                 # FastAPI endpoints & static file server
│       ├── otp.py                  # True OTP encryption (Shannon perfect secrecy)
│       ├── stego_wav.py            # WAV engine (dynamic amplitude masking & PRW)
│       ├── stego_mp3.py            # MP3 engine (ISO/IEC 11172-3 private channels)
│       ├── steganalysis.py         # Chi-Square, SNR, PSNR & entropy calculators
│       └── utils.py                # Audio sniffing and capacity computation
│
└── frontend/
    ├── package.json                # Node dependencies & build scripts
    ├── vite.config.js              # Vite configuration with API proxy
    ├── tailwind.config.js          # Tailwind CSS theme & cyber palette
    ├── index.html                  # HTML entry point
    └── src/
        ├── App.jsx                 # Main layout & tab router
        ├── index.css               # Global styling
        └── components/
            ├── Header.jsx          # Header & theory modal
            ├── AudioWaveform.jsx   # WaveSurfer.js interactive waveform player
            ├── EncodeTab.jsx       # OTP encryption & carrier embedding tab
            ├── DecodeTab.jsx       # Extraction & OTP decryption tab
            └── SteganalysisLab.jsx # Comparative Chi-Square & acoustic audit lab
```
