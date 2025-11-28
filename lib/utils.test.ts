/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { base64ToArrayBuffer } from './utils';

describe('base64ToArrayBuffer', () => {
    it('should convert base64 string to ArrayBuffer correctly', () => {
        // Simple base64 string representing "Hello"
        const base64 = 'SGVsbG8=';

        const result = base64ToArrayBuffer(base64);

        expect(result).toBeInstanceOf(ArrayBuffer);

        // Convert back to verify
        const uint8Array = new Uint8Array(result);
        const text = String.fromCharCode(...uint8Array);
        expect(text).toBe('Hello');
    });

    it('should handle empty base64 string', () => {
        const base64 = '';

        const result = base64ToArrayBuffer(base64);

        expect(result).toBeInstanceOf(ArrayBuffer);
        expect(result.byteLength).toBe(0);
    });

    it('should convert PCM16 audio data correctly', () => {
        // Sample base64 representing a small audio chunk
        const base64 = 'AAABAAIAAP//';

        const result = base64ToArrayBuffer(base64);

        expect(result).toBeInstanceOf(ArrayBuffer);
        expect(result.byteLength).toBeGreaterThan(0);

        // Verify it's a valid ArrayBuffer
        const uint8Array = new Uint8Array(result);
        expect(uint8Array.length).toBe(result.byteLength);
    });

    it('should handle longer base64 strings', () => {
        // Longer base64 string
        const base64 = 'VGhpcyBpcyBhIGxvbmdlciB0ZXN0IHN0cmluZyB0byB2ZXJpZnkgdGhlIGNvbnZlcnNpb24=';

        const result = base64ToArrayBuffer(base64);

        expect(result).toBeInstanceOf(ArrayBuffer);

        const uint8Array = new Uint8Array(result);
        const text = String.fromCharCode(...uint8Array);
        expect(text).toBe('This is a longer test string to verify the conversion');
    });
});
