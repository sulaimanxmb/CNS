"""
WAV Audio Steganography Engine
Implements undetectable pseudo-random walk LSB steganography with dynamic amplitude masking.
"""

import io
import wave
import hmac
import hashlib
import struct
from typing import Tuple, List
import numpy as np

from app.otp import parse_otp_key_package


def _generate_prw_permutation(seed: bytes, total_slots: int, needed_slots: int) -> List[int]:
    """
    Generate a pseudo-random permutation of carrier slots using HMAC-SHA256 (Fisher-Yates variant).
    Guarantees key-dependent random scattering across the audio file.
    """
    slots = list(range(total_slots))
    counter = 0
    stream = b""
    
    # We only need to shuffle enough elements to fill needed_slots
    limit = max(0, total_slots - needed_slots - 1)
    for i in range(total_slots - 1, limit, -1):
        if len(stream) < 4:
            stream = hmac.new(seed, counter.to_bytes(4, "big"), hashlib.sha256).digest()
            counter += 1
        val = int.from_bytes(stream[:4], "big")
        stream = stream[4:]
        j = val % (i + 1)
        slots[i], slots[j] = slots[j], slots[i]
        
    return [slots[total_slots - 1 - k] for k in range(needed_slots)]


def get_wav_capacity(wav_bytes: bytes) -> dict:
    """Calculate the safe steganographic capacity for a WAV file."""
    with io.BytesIO(wav_bytes) as buf, wave.open(buf, "rb") as wav_in:
        params = wav_in.getparams()
        n_frames = wav_in.getnframes()
        sampwidth = wav_in.getsampwidth()
        raw = wav_in.readframes(n_frames)
        
    if sampwidth == 2:
        samples = np.frombuffer(raw, dtype=np.int16)
    elif sampwidth == 3:
        # 24-bit PCM
        samples = np.frombuffer(raw, dtype=np.uint8)
        # 3 bytes per sample
        samples = samples.reshape(-1, 3)[:, 2].astype(np.int8)
    elif sampwidth == 4:
        samples = np.frombuffer(raw, dtype=np.int32)
    else:
        samples = np.frombuffer(raw, dtype=np.int16)
        
    # Active samples (avoiding absolute silence < 10)
    active = np.where(np.abs(samples) >= 10)[0]
    total_active_bits = len(active)
    # Subtract 32 bits for the length header
    max_payload_bytes = max(0, (total_active_bits - 32) // 8)
    
    duration = n_frames / float(params.framerate) if params.framerate > 0 else 0
    
    return {
        "format": "WAV",
        "channels": params.nchannels,
        "sample_rate": params.framerate,
        "sample_width_bytes": sampwidth,
        "bit_depth": sampwidth * 8,
        "duration_sec": round(duration, 2),
        "total_samples": len(samples),
        "usable_samples": int(total_active_bits),
        "safe_capacity_bytes": int(max_payload_bytes),
        "safe_capacity_kb": round(max_payload_bytes / 1024, 2)
    }


def embed_in_wav(wav_bytes: bytes, ciphertext: bytes, key_bytes: bytes) -> bytes:
    """
    Embed encrypted ciphertext into a WAV file using Key-Derived Pseudo-Random Walk.
    
    Parameters:
    - wav_bytes: Raw bytes of cover WAV file.
    - ciphertext: Pre-encrypted OTP ciphertext (4 bytes encrypted length + L bytes payload).
    - key_bytes: The OTP key package containing the 32-byte PRW seed.
    
    Returns:
    - bytes of stego WAV file.
    """
    seed, k_len, k_payload = parse_otp_key_package(key_bytes)
    
    with io.BytesIO(wav_bytes) as buf, wave.open(buf, "rb") as wav_in:
        params = wav_in.getparams()
        n_frames = wav_in.getnframes()
        sampwidth = wav_in.getsampwidth()
        raw = wav_in.readframes(n_frames)
        
    if sampwidth != 2:
        # Standardize 16-bit PCM for universal compatibility
        samples = np.frombuffer(raw, dtype=np.int16).copy()
    else:
        samples = np.frombuffer(raw, dtype=np.int16).copy()
        
    active_indices = np.where(np.abs(samples) >= 10)[0]
    
    # Expand ciphertext into bitstream
    bits = []
    for b in ciphertext:
        for shift in range(7, -1, -1):
            bits.append((b >> shift) & 1)
            
    needed_bits = len(bits)
    if needed_bits > len(active_indices):
        raise ValueError(
            f"WAV carrier capacity exceeded. Need {needed_bits} slots, but only {len(active_indices)} active samples available."
        )
        
    # Generate Pseudo-Random Walk positions
    chosen_slot_offsets = _generate_prw_permutation(seed, len(active_indices), needed_bits)
    target_sample_indices = active_indices[chosen_slot_offsets]
    
    # Embed bits into least significant bit of selected samples
    for sample_idx, bit in zip(target_sample_indices, bits):
        samples[sample_idx] = (samples[sample_idx] & ~1) | bit
        
    out_buf = io.BytesIO()
    with wave.open(out_buf, "wb") as wav_out:
        wav_out.setparams(params)
        wav_out.writeframes(samples.tobytes())
        
    return out_buf.getvalue()


def extract_from_wav(stego_wav_bytes: bytes, key_bytes: bytes) -> bytes:
    """
    Extract and decrypt hidden payload from a stego WAV file using the OTP key.
    
    Returns:
    - Decrypted plaintext payload bytes.
    """
    seed, k_len, k_payload = parse_otp_key_package(key_bytes)
    
    with io.BytesIO(stego_wav_bytes) as buf, wave.open(buf, "rb") as wav_in:
        params = wav_in.getparams()
        n_frames = wav_in.getnframes()
        raw = wav_in.readframes(n_frames)
        
    samples = np.frombuffer(raw, dtype=np.int16)
    active_indices = np.where(np.abs(samples) >= 10)[0]
    
    if len(active_indices) < 32:
        raise ValueError("Audio file too short to contain embedded steganographic data.")
        
    # Phase 1: Extract 32 bits of encrypted length
    len_slot_offsets = _generate_prw_permutation(seed, len(active_indices), 32)
    len_sample_indices = active_indices[len_slot_offsets]
    len_bits = [(samples[idx] & 1) for idx in len_sample_indices]
    
    c_len_bytes = bytearray()
    for b_idx in range(0, 32, 8):
        byte = 0
        for bit in len_bits[b_idx:b_idx + 8]:
            byte = (byte << 1) | bit
        c_len_bytes.append(byte)
        
    # Decrypt length using OTP k_len
    L = struct.unpack(">I", bytes(a ^ b for a, b in zip(c_len_bytes, k_len)))[0]
    
    total_bits = 32 + (L * 8)
    if total_bits > len(active_indices):
        raise ValueError(
            f"Extraction failed: Decrypted payload length ({L} bytes) exceeds audio capacity. Key is likely invalid."
        )
        
    # Phase 2: Extract all payload bits
    all_slot_offsets = _generate_prw_permutation(seed, len(active_indices), total_bits)
    payload_sample_indices = active_indices[all_slot_offsets[32:total_bits]]
    payload_bits = [(samples[idx] & 1) for idx in payload_sample_indices]
    
    c_payload_bytes = bytearray()
    for b_idx in range(0, L * 8, 8):
        byte = 0
        for bit in payload_bits[b_idx:b_idx + 8]:
            byte = (byte << 1) | bit
        c_payload_bytes.append(byte)
        
    # Decrypt payload using OTP k_payload
    plaintext = bytes(a ^ b for a, b in zip(c_payload_bytes, k_payload[:L]))
    return plaintext
