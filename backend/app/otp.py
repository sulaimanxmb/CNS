"""
True One-Time Pad (OTP) Cryptographic Engine
Implements information-theoretic perfect secrecy (Shannon's Theorem).
"""

import os
import math
import struct
from typing import Tuple, Dict, Any


def calculate_entropy(data: bytes) -> float:
    """Calculate Shannon entropy in bits per byte (max 8.0)."""
    if not data:
        return 0.0
    freq = {}
    for b in data:
        freq[b] = freq.get(b, 0) + 1
    total = len(data)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        entropy -= p * math.log2(p)
    return entropy


def generate_otp_key_package(payload_length: int) -> bytes:
    """
    Generate a full OTP key package:
    - 32-byte CSPRNG seed for carrier pseudo-random walk
    - 4-byte OTP key for payload length
    - L-byte OTP key for payload bytes
    Total length: 36 + payload_length bytes.
    """
    seed = os.urandom(32)
    k_len = os.urandom(4)
    k_payload = os.urandom(payload_length)
    return seed + k_len + k_payload


def parse_otp_key_package(key_bytes: bytes) -> Tuple[bytes, bytes, bytes]:
    """Extract (seed, k_len, k_payload) from key package."""
    if len(key_bytes) < 36:
        raise ValueError("Invalid key: Key package must be at least 36 bytes.")
    seed = key_bytes[:32]
    k_len = key_bytes[32:36]
    k_payload = key_bytes[36:]
    return seed, k_len, k_payload


def otp_encrypt(plaintext: bytes) -> Dict[str, Any]:
    """
    Encrypt plaintext using True One-Time Pad.
    Returns the key package and ciphertext.
    """
    L = len(plaintext)
    if L == 0:
        raise ValueError("Cannot encrypt empty message.")
    
    key_package = generate_otp_key_package(L)
    seed, k_len, k_payload = parse_otp_key_package(key_package)
    
    # Encrypt length (4 bytes)
    c_len = bytes(a ^ b for a, b in zip(struct.pack(">I", L), k_len))
    # Encrypt payload (L bytes)
    c_payload = bytes(a ^ b for a, b in zip(plaintext, k_payload))
    
    full_ciphertext = c_len + c_payload
    
    return {
        "key_bytes": key_package,
        "key_hex": key_package.hex(),
        "ciphertext_bytes": full_ciphertext,
        "ciphertext_hex": full_ciphertext.hex(),
        "payload_length": L,
        "entropy": calculate_entropy(full_ciphertext)
    }


def otp_decrypt(key_bytes: bytes, ciphertext: bytes) -> bytes:
    """
    Decrypt OTP-encrypted payload given the full key package.
    """
    seed, k_len, k_payload = parse_otp_key_package(key_bytes)
    
    if len(ciphertext) < 4:
        raise ValueError("Ciphertext too short to contain length.")
    
    c_len = ciphertext[:4]
    L = struct.unpack(">I", bytes(a ^ b for a, b in zip(c_len, k_len)))[0]
    
    if len(ciphertext) < 4 + L:
        raise ValueError(f"Ciphertext length mismatch: claimed {L} bytes, got {len(ciphertext) - 4}")
    
    c_payload = ciphertext[4:4 + L]
    if len(k_payload) < L:
        raise ValueError("Key package is shorter than ciphertext payload length.")
    
    plaintext = bytes(a ^ b for a, b in zip(c_payload, k_payload[:L]))
    return plaintext
