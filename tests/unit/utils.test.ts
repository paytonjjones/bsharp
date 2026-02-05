import { describe, it, expect, vi } from 'vitest';
import { randomElem, validInt } from '../../src/ts/utils';

describe('randomElem', () => {
    it('always picks the only nonzero weight', () => {
        const arr = ['a', 'b', 'c'];
        const result = randomElem(arr, [0, 1, 0]);
        expect(result).toBe('b');
    });

    it('falls back to last element when random exceeds cumulative weights', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.99);
        const result = randomElem(['a', 'b', 'c'], [0.1, 0.1, 0.1]);
        expect(result).toBe('c');
        vi.restoreAllMocks();
    });
});

describe('validInt', () => {
    it('accepts valid integer strings', () => {
        expect(validInt('42')).toBe(true);
        expect(validInt('0')).toBe(true);
        expect(validInt('-7')).toBe(true);
    });

    it('rejects floats', () => {
        expect(validInt('3.14')).toBe(false);
    });

    it('rejects non-numeric strings', () => {
        expect(validInt('abc')).toBe(false);
        expect(validInt('')).toBe(false);
    });

    it('rejects strings with trailing text', () => {
        expect(validInt('42abc')).toBe(false);
    });
});
