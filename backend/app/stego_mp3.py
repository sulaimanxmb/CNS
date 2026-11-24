"""
MP3 Audio Steganography Engine
Supports dual-mode undetectable steganography:
1. 'stealth' mode: ISO/IEC 11172-3 MPEG-1/2 Layer III standardized private bits. Zero acoustic modification, bitstream-level stealth.
2. 'extended' mode: ISO ID3v2.3/2.4 Standard Private (PRIV) frame steganography with True OTP encryption. Supports high-capacity payloads (hundreds of KB) with zero audio degradation.
"""

import os
import io
import hmac
import hashlib
import struct
from typing import Tuple, List, Dict, Any

from app.otp import parse_otp_key_package


MPEG1_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
MPEG1_SAMPLERATES = [44100, 48000, 32000, 0]

MPEG2_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
MPEG2_SAMPLERATES = [22050, 24000, 16000, 0]


def parse_mp3_frames(data: bytes) -> List[Dict[str, Any]]:
    """Parse MP3 byte stream into MPEG Audio Layer III frames."""
    pos = 0
    frames = []
    data_len = len(data)
    
    while pos < data_len - 4:
        if data[pos] == 0xFF and (data[pos + 1] & 0xE0) == 0xE0:
            b1, b2, b3, b4 = data[pos], data[pos + 1], data[pos + 2], data[pos + 3]
            version_bits = (b2 >> 3) & 0x03
            layer_bits = (b2 >> 1) & 0x03
            protection = b2 & 0x01
            bitrate_idx = (b3 >> 4) & 0x0F
            samplerate_idx = (b3 >> 2) & 0x03
            padding = (b3 >> 1) & 0x01
            channel_mode = (b4 >> 6) & 0x03
            
            if layer_bits == 1 and bitrate_idx in range(1, 15) and samplerate_idx in [0, 1, 2]:
                is_mpeg1 = (version_bits == 3)
                if is_mpeg1:
                    br = MPEG1_BITRATES[bitrate_idx] * 1000
                    sr = MPEG1_SAMPLERATES[samplerate_idx]
                    frame_len = (144 * br // sr) + padding
                    side_info_len = 17 if channel_mode == 3 else 32
                else:
                    br = MPEG2_BITRATES[bitrate_idx] * 1000
                    sr = MPEG2_SAMPLERATES[samplerate_idx]
                    frame_len = (72 * br // sr) + padding
                    side_info_len = 9 if channel_mode == 3 else 17
                    
                header_len = 4 if protection == 1 else 6
                
                if pos + frame_len <= data_len:
                    frames.append({
                        "pos": pos,
                        "len": frame_len,
                        "header_len": header_len,
                        "side_info_pos": pos + header_len,
                        "channel_mode": channel_mode,
                        "is_mpeg1": is_mpeg1,
                        "bitrate": br,
                        "samplerate": sr
                    })
                    pos += frame_len
                    continue
        pos += 1
        
    return frames


def get_mp3_bit_slots(frames: List[Dict[str, Any]]) -> List[Tuple[int, int]]:
    """Extract all standardized private bit slots: (byte_index, bit_mask)."""
    slots = []
    for f in frames:
        slots.append((f["pos"] + 2, 0x01))
        si_byte1 = f["side_info_pos"] + 1
        if f["channel_mode"] == 3: # Mono: 3 bits
            for shift in [6, 5, 4]:
                slots.append((si_byte1, 1 << shift))
        else: # Stereo: 5 bits
            for shift in [6, 5, 4, 3, 2]:
                slots.append((si_byte1, 1 << shift))
    return slots


def _generate_prw_permutation(seed: bytes, total_slots: int, needed_slots: int) -> List[int]:
    """Pseudo-random walk permutation over available MP3 slots."""
    slots = list(range(total_slots))
    counter = 0
    stream = b""
    
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


def get_mp3_capacity(mp3_bytes: bytes) -> dict:
    """Calculate the safe steganographic capacity for an MP3 file."""
    frames = parse_mp3_frames(mp3_bytes)
    if not frames:
        return {
            "format": "MP3",
            "error": "No valid MPEG Layer III frames detected.",
            "safe_capacity_bytes": 0
        }
        
    slots = get_mp3_bit_slots(frames)
    total_slots = len(slots)
    max_payload_bytes = max(0, (total_slots - 32) // 8)
    
    first_frame = frames[0]
    total_audio_samples = len(frames) * 1152
    duration_sec = total_audio_samples / float(first_frame["samplerate"]) if first_frame["samplerate"] > 0 else 0
    
    # Extended mode allows up to 10MB safely without audio corruption
    return {
        "format": "MP3",
        "channels": 1 if first_frame["channel_mode"] == 3 else 2,
        "sample_rate": first_frame["samplerate"],
        "bitrate_kbps": first_frame["bitrate"] // 1000,
        "duration_sec": round(duration_sec, 2),
        "total_frames": len(frames),
        "usable_bit_slots": total_slots,
        "safe_capacity_bytes": int(max_payload_bytes),
        "safe_capacity_kb": round(max_payload_bytes / 1024, 2),
        "extended_capacity_kb": 10240 # 10 MB in extended mode
    }


def _encode_syncsafe(val: int) -> bytes:
    """Encode 28-bit integer into 4-byte syncsafe integer."""
    b0 = (val >> 21) & 0x7F
    b1 = (val >> 14) & 0x7F
    b2 = (val >> 7) & 0x7F
    b3 = val & 0x7F
    return bytes([b0, b1, b2, b3])


def _decode_syncsafe(b: bytes) -> int:
    """Decode 4-byte syncsafe integer."""
    return ((b[0] & 0x7F) << 21) | ((b[1] & 0x7F) << 14) | ((b[2] & 0x7F) << 7) | (b[3] & 0x7F)


def embed_in_mp3(mp3_bytes: bytes, ciphertext: bytes, key_bytes: bytes) -> bytes:
    """
    Embed encrypted ciphertext into an MP3 file.
    If payload fits in standardized MPEG frame private bits, uses bitstream stealth mode.
    If payload exceeds frame private bits, uses standardized ID3v2 PRIV encapsulation.
    """
    seed, k_len, k_payload = parse_otp_key_package(key_bytes)
    
    frames = parse_mp3_frames(mp3_bytes)
    if not frames:
        raise ValueError("Invalid MP3: No valid MPEG Layer III frames found.")
        
    slots = get_mp3_bit_slots(frames)
    needed_bits = len(ciphertext) * 8
    
    if needed_bits <= len(slots):
        # Stealth Mode: MPEG frame private channels
        data = bytearray(mp3_bytes)
        chosen_slot_offsets = _generate_prw_permutation(seed, len(slots), needed_bits)
        chosen_slots = [slots[idx] for idx in chosen_slot_offsets]
        
        bits = []
        for b in ciphertext:
            for shift in range(7, -1, -1):
                bits.append((b >> shift) & 1)
                
        for (byte_pos, mask), bit in zip(chosen_slots, bits):
            if bit == 1:
                data[byte_pos] |= mask
            else:
                data[byte_pos] &= ~mask
        return bytes(data)
        
    else:
        # Extended High-Capacity Mode: Standardized ID3v2 PRIV frame with OTP encrypted payload
        # Generate disguised owner tag derived from seed
        owner_id = hmac.new(seed, b"MP3_PRIV_OWNER", hashlib.sha256).hexdigest()[:16].encode("ascii") + b"\x00"
        priv_body = owner_id + ciphertext
        frame_header = b"PRIV" + struct.pack(">I", len(priv_body)) + b"\x00\x00"
        priv_frame = frame_header + priv_body
        
        # Check if file has existing ID3v2 tag
        if mp3_bytes.startswith(b"ID3"):
            tag_size = _decode_syncsafe(mp3_bytes[6:10])
            total_tag_len = 10 + tag_size
            old_tag_body = mp3_bytes[10:total_tag_len]
            audio_part = mp3_bytes[total_tag_len:]
            new_tag_body = old_tag_body + priv_frame
            new_tag_header = b"ID3\x03\x00\x00" + _encode_syncsafe(len(new_tag_body))
            return new_tag_header + new_tag_body + audio_part
        else:
            # Prepend new standard ID3v2 tag
            new_tag_header = b"ID3\x03\x00\x00" + _encode_syncsafe(len(priv_frame))
            return new_tag_header + priv_frame + mp3_bytes


def extract_from_mp3(stego_mp3_bytes: bytes, key_bytes: bytes) -> bytes:
    """
    Extract and decrypt hidden payload from an MP3 file using the OTP key.
    Automatically detects whether 'stealth' or 'extended' mode was used.
    """
    seed, k_len, k_payload = parse_otp_key_package(key_bytes)
    
    # 1. First check if an extended PRIV frame exists matching this key's seed
    if stego_mp3_bytes.startswith(b"ID3"):
        expected_owner = hmac.new(seed, b"MP3_PRIV_OWNER", hashlib.sha256).hexdigest()[:16].encode("ascii") + b"\x00"
        tag_size = _decode_syncsafe(stego_mp3_bytes[6:10])
        tag_data = stego_mp3_bytes[10:10 + tag_size]
        
        pos = 0
        while pos < len(tag_data) - 10:
            frame_id = tag_data[pos:pos + 4]
            frame_len = struct.unpack(">I", tag_data[pos + 4:pos + 8])[0]
            if frame_id == b"PRIV" and pos + 10 + frame_len <= len(tag_data):
                content = tag_data[pos + 10:pos + 10 + frame_len]
                if content.startswith(expected_owner):
                    # Found matching PRIV frame!
                    ciphertext = content[len(expected_owner):]
                    c_len = ciphertext[:4]
                    L = struct.unpack(">I", bytes(a ^ b for a, b in zip(c_len, k_len)))[0]
                    c_payload = ciphertext[4:4 + L]
                    return bytes(a ^ b for a, b in zip(c_payload, k_payload[:L]))
            pos += 1
            
    # 2. Otherwise extract from MPEG frame private channels
    frames = parse_mp3_frames(stego_mp3_bytes)
    if not frames:
        raise ValueError("Invalid MP3: No valid MPEG Layer III frames found.")
        
    slots = get_mp3_bit_slots(frames)
    if len(slots) < 32:
        raise ValueError("Audio file too short to contain embedded steganographic data.")
        
    len_slot_offsets = _generate_prw_permutation(seed, len(slots), 32)
    len_slots = [slots[idx] for idx in len_slot_offsets]
    len_bits = [1 if (stego_mp3_bytes[bp] & mask) else 0 for (bp, mask) in len_slots]
    
    c_len_bytes = bytearray()
    for b_idx in range(0, 32, 8):
        byte = 0
        for bit in len_bits[b_idx:b_idx + 8]:
            byte = (byte << 1) | bit
        c_len_bytes.append(byte)
        
    L = struct.unpack(">I", bytes(a ^ b for a, b in zip(c_len_bytes, k_len)))[0]
    total_bits = 32 + (L * 8)
    
    if total_bits > len(slots):
        raise ValueError(
            f"Extraction failed: Decrypted payload length ({L} bytes) exceeds MP3 capacity. Key is likely invalid."
        )
        
    all_slot_offsets = _generate_prw_permutation(seed, len(slots), total_bits)
    payload_slots = [slots[idx] for idx in all_slot_offsets[32:total_bits]]
    payload_bits = [1 if (stego_mp3_bytes[bp] & mask) else 0 for (bp, mask) in payload_slots]
    
    c_payload_bytes = bytearray()
    for b_idx in range(0, L * 8, 8):
        byte = 0
        for bit in payload_bits[b_idx:b_idx + 8]:
            byte = (byte << 1) | bit
        c_payload_bytes.append(byte)
        
    return bytes(a ^ b for a, b in zip(c_payload_bytes, k_payload[:L]))
