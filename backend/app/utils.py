"""
Audio Utilities and Format Sniffing
"""

import io
from typing import Tuple, Dict, Any
from pydub import AudioSegment

from app.stego_wav import get_wav_capacity
from app.stego_mp3 import get_mp3_capacity


def detect_audio_format(file_bytes: bytes, filename: str = "") -> str:
    """
    Detect whether audio is WAV, MP3, or unsupported.
    Uses magic bytes inspection with filename fallback.
    """
    if file_bytes.startswith(b"RIFF") and b"WAVE" in file_bytes[:16]:
        return "wav"
    
    # MP3 ID3v2 tag: "ID3"
    if file_bytes.startswith(b"ID3"):
        return "mp3"
        
    # MP3 sync word (0xFFE0 mask)
    for i in range(min(1024, len(file_bytes) - 2)):
        if file_bytes[i] == 0xFF and (file_bytes[i + 1] & 0xE0) == 0xE0:
            return "mp3"
            
    lower_fn = filename.lower()
    if lower_fn.endswith(".wav"):
        return "wav"
    elif lower_fn.endswith(".mp3"):
        return "mp3"
        
    return "unknown"


def get_audio_info(file_bytes: bytes, filename: str = "") -> Dict[str, Any]:
    """Inspect and return metadata and safe stego capacity."""
    fmt = detect_audio_format(file_bytes, filename)
    if fmt == "wav":
        return get_wav_capacity(file_bytes)
    elif fmt == "mp3":
        return get_mp3_capacity(file_bytes)
    else:
        raise ValueError("Unsupported audio format. Please provide a .wav or .mp3 audio file.")
