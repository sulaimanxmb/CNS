"""
CipherLoom Backend API
FastAPI service for True OTP Encryption & Steganalysis-Resistant Audio Steganography.
"""

import os
import io
import math
import base64
import wave
import struct
import tempfile
import subprocess
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.otp import otp_encrypt, otp_decrypt, calculate_entropy, parse_otp_key_package
from app.stego_wav import embed_in_wav, extract_from_wav, get_wav_capacity
from app.stego_mp3 import embed_in_mp3, extract_from_mp3, get_mp3_capacity
from app.steganalysis import analyze_wav_pair, analyze_mp3_pair
from app.utils import detect_audio_format, get_audio_info, sniff_file_format

app = FastAPI(
    title="CipherLoom API",
    description="True OTP Encryption & Steganographic Audio Engine (WAV & MP3)",
    version="2.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": "CipherLoom Steganography Engine",
        "supported_formats": ["WAV (Lossless PCM)", "MP3 (MPEG Layer 3)"],
        "cryptography": "True One-Time Pad (Shannon Perfect Secrecy)"
    }


@app.post("/api/analyze-audio")
async def analyze_audio(audio_file: UploadFile = File(...)):
    """
    Inspect an audio file and return format, duration, and safe stealth capacity.
    """
    file_bytes = await audio_file.read()
    filename = audio_file.filename or ""
    
    try:
        info = get_audio_info(file_bytes, filename)
        return {
            "success": True,
            "filename": filename,
            "file_size_bytes": len(file_bytes),
            "info": info
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/embed")
async def embed_secret(
    audio_file: UploadFile = File(...),
    secret_text: Optional[str] = Form(None),
    secret_file: Optional[UploadFile] = File(None)
):
    """
    Encrypt secret with True OTP and embed into audio carrier with Zero-Detection PRW.
    Returns the stego audio and the OTP key package.
    """
    audio_bytes = await audio_file.read()
    filename = audio_file.filename or "carrier.wav"
    
    # 1. Determine payload bytes
    if secret_file and secret_file.filename:
        payload_bytes = await secret_file.read()
    elif secret_text is not None and len(secret_text.strip()) > 0:
        payload_bytes = secret_text.encode("utf-8")
    else:
        raise HTTPException(status_code=400, detail="Please provide secret text or a secret file to hide.")
        
    if len(payload_bytes) == 0:
        raise HTTPException(status_code=400, detail="Secret payload is empty.")
        
    # 2. Sniff format
    fmt = detect_audio_format(audio_bytes, filename)
    if fmt not in ["wav", "mp3"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{fmt}'. Please upload a valid .wav or .mp3 file."
        )
        
    # 3. Encrypt payload with True OTP
    try:
        otp_result = otp_encrypt(payload_bytes)
        key_bytes = otp_result["key_bytes"]
        ciphertext = otp_result["ciphertext_bytes"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OTP Encryption failed: {str(e)}")
        
    # 4. Embed ciphertext into audio carrier
    try:
        if fmt == "wav":
            stego_bytes = embed_in_wav(audio_bytes, ciphertext, key_bytes)
            steganalysis_report = analyze_wav_pair(audio_bytes, stego_bytes)
            mime_type = "audio/wav"
            out_filename = "stego_" + (filename if filename.lower().endswith(".wav") else "audio.wav")
        else: # mp3
            stego_bytes = embed_in_mp3(audio_bytes, ciphertext, key_bytes)
            steganalysis_report = analyze_mp3_pair(audio_bytes, stego_bytes)
            mime_type = "audio/mpeg"
            out_filename = "stego_" + (filename if filename.lower().endswith(".mp3") else "audio.mp3")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stego embedding failed: {str(e)}")
        
    # Encode outputs for instant dashboard playback and download
    stego_base64 = base64.b64encode(stego_bytes).decode("ascii")
    key_base64 = base64.b64encode(key_bytes).decode("ascii")
    key_hex = key_bytes.hex()
    
    return {
        "success": True,
        "format": fmt.upper(),
        "out_filename": out_filename,
        "payload_length_bytes": len(payload_bytes),
        "key_length_bytes": len(key_bytes),
        "key_hex": key_hex,
        "key_base64": key_base64,
        "stego_audio_base64": f"data:{mime_type};base64,{stego_base64}",
        "steganalysis": steganalysis_report,
        "message": f"Successfully encrypted with True OTP and hidden into {fmt.upper()} carrier with zero statistical detectability."
    }


@app.post("/api/extract")
async def extract_secret(
    audio_file: UploadFile = File(...),
    key_file: Optional[UploadFile] = File(None),
    key_hex: Optional[str] = Form(None)
):
    """
    Extract hidden ciphertext from stego audio and decrypt using the OTP key package.
    """
    audio_bytes = await audio_file.read()
    filename = audio_file.filename or ""
    
    # 1. Parse OTP Key
    key_bytes = None
    if key_file and key_file.filename:
        key_bytes = await key_file.read()
    elif key_hex and key_hex.strip():
        try:
            key_bytes = bytes.fromhex(key_hex.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Key Hex string format.")
    else:
        raise HTTPException(status_code=400, detail="Please upload a .key file or paste the Key Hex string.")
        
    if not key_bytes or len(key_bytes) < 36:
        raise HTTPException(status_code=400, detail="Invalid OTP Key: Key must be at least 36 bytes.")
        
    # 2. Sniff format
    fmt = detect_audio_format(audio_bytes, filename)
    if fmt not in ["wav", "mp3"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{fmt}'. Please upload a valid .wav or .mp3 stego file."
        )
        
    # 3. Extract and Decrypt
    try:
        if fmt == "wav":
            decrypted_bytes = extract_from_wav(audio_bytes, key_bytes)
        else:
            decrypted_bytes = extract_from_mp3(audio_bytes, key_bytes)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Extraction failed: {str(e)}. Ensure the key matches the audio carrier.")
        
    # Check if decrypted bytes can be rendered as UTF-8 text
    is_text = True
    try:
        text_content = decrypted_bytes.decode("utf-8")
        # Check if text contains control characters (suggesting it's actually binary data)
        if any(b < 32 and b not in (9, 10, 13) for b in decrypted_bytes[:1024]):
            is_text = False
            text_content = None
    except UnicodeDecodeError:
        is_text = False
        text_content = None
        
    ext, mime_type, file_desc = sniff_file_format(decrypted_bytes)
    suggested_filename = f"decrypted_secret.{ext}"
    payload_base64 = base64.b64encode(decrypted_bytes).decode("ascii")
    
    return {
        "success": True,
        "format": fmt.upper(),
        "payload_length_bytes": len(decrypted_bytes),
        "is_text": is_text,
        "text_content": text_content,
        "detected_extension": ext,
        "file_description": file_desc,
        "suggested_filename": suggested_filename,
        "payload_base64": f"data:{mime_type};base64,{payload_base64}",
        "message": "Hidden data successfully extracted and decrypted with True One-Time Pad!"
    }


@app.post("/api/steganalysis")
async def run_steganalysis(
    cover_file: UploadFile = File(...),
    stego_file: UploadFile = File(...)
):
    """
    Run detailed statistical steganalysis comparing cover and stego audio files.
    """
    cover_bytes = await cover_file.read()
    stego_bytes = await stego_file.read()
    
    fmt1 = detect_audio_format(cover_bytes, cover_file.filename or "")
    fmt2 = detect_audio_format(stego_bytes, stego_file.filename or "")
    
    if fmt1 != fmt2 or fmt1 not in ["wav", "mp3"]:
        raise HTTPException(status_code=400, detail="Both audio files must share the same format (.wav or .mp3).")
        
    try:
        if fmt1 == "wav":
            report = analyze_wav_pair(cover_bytes, stego_bytes)
        else:
            report = analyze_mp3_pair(cover_bytes, stego_bytes)
            
        return {
            "success": True,
            "format": fmt1.upper(),
            "report": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Steganalysis failed: {str(e)}")


@app.get("/api/sample-audio/{fmt}")
async def get_sample_audio(fmt: str):
    """
    Generate and serve high-fidelity sample audio files (.wav or .mp3) for instant UI testing.
    """
    fmt_lower = fmt.lower()
    if fmt_lower not in ["wav", "mp3"]:
        raise HTTPException(status_code=400, detail="Format must be 'wav' or 'mp3'.")
        
    # Generate 4-second rich acoustic audio (harmonics of 440Hz, 880Hz, 1320Hz)
    framerate = 44100
    duration = 4.0
    n_samples = int(framerate * duration)
    
    t = [i / float(framerate) for i in range(n_samples)]
    samples = []
    for time_pt in t:
        # Multi-harmonic chord with smooth envelope
        envelope = math.sin(math.pi * time_pt / duration)
        v = (
            0.5 * math.sin(2 * math.pi * 440 * time_pt) +
            0.3 * math.sin(2 * math.pi * 554.37 * time_pt) +
            0.2 * math.sin(2 * math.pi * 659.25 * time_pt)
        ) * envelope * 24000.0
        val = int(v)
        samples.append(struct.pack("<hh", val, val))
        
    wav_buf = io.BytesIO()
    with wave.open(wav_buf, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(framerate)
        f.writeframes(b"".join(samples))
        
    wav_data = wav_buf.getvalue()
    
    if fmt_lower == "wav":
        return Response(
            content=wav_data,
            media_type="audio/wav",
            headers={"Content-Disposition": 'attachment; filename="sample_audio.wav"'}
        )
    else:
        # Convert to MP3
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tw:
            tw.write(wav_data)
            tmp_wav = tw.name
            
        tmp_mp3 = tmp_wav.replace(".wav", ".mp3")
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_wav, "-b:a", "192k", tmp_mp3],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            with open(tmp_mp3, "rb") as mf:
                mp3_data = mf.read()
                
            return Response(
                content=mp3_data,
                media_type="audio/mpeg",
                headers={"Content-Disposition": 'attachment; filename="sample_audio.mp3"'}
            )
        finally:
            if os.path.exists(tmp_wav):
                os.unlink(tmp_wav)
            if os.path.exists(tmp_mp3):
                os.unlink(tmp_mp3)


# Serve frontend build if available
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(frontend_dist, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
