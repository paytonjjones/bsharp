import { describe, it, expect } from 'vitest';
import { calculatePercentage, calculateNeutralLevel, mergeMatrices, calculateCoefficients } from '../../src/ts/stats';

describe('calculatePercentage', () => {
    it('returns 75 as default when no identifications', () => {
        expect(calculatePercentage(0, 0)).toBe(75);
    });

    it('computes correct percentage', () => {
        expect(calculatePercentage(3, 4)).toBe(75);
        expect(calculatePercentage(1, 2)).toBe(50);
    });
});

describe('calculateNeutralLevel', () => {
    it('clamps to 0 at or below 50%', () => {
        expect(calculateNeutralLevel(50)).toBe(0);
        expect(calculateNeutralLevel(30)).toBe(0);
    });

    it('clamps to 4 at high percentages', () => {
        expect(calculateNeutralLevel(100)).toBe(4);
        expect(calculateNeutralLevel(95)).toBe(4);
    });

    it('maps intermediate percentages to levels', () => {
        expect(calculateNeutralLevel(60)).toBe(1);
        expect(calculateNeutralLevel(70)).toBe(2);
        expect(calculateNeutralLevel(80)).toBe(3);
    });
});

describe('mergeMatrices', () => {
    it('sums values across multiple confusion matrices', () => {
        const cm1: Record<string, Record<string, number>> = {
            red: { red: 5, yellow: 1 },
            yellow: { yellow: 3 },
        };
        const cm2: Record<string, Record<string, number>> = {
            red: { red: 2, yellow: 2 },
            blue: { blue: 4 },
        };

        const merged = mergeMatrices([cm1, cm2], 3);
        expect(merged.red.red).toBe(7);
        expect(merged.red.yellow).toBe(3);
        expect(merged.blue.blue).toBe(4);
    });

    it('returns zero matrix when given no confusion matrices', () => {
        const merged = mergeMatrices([], 3);
        expect(merged.red.red).toBe(0);
        expect(merged.red.yellow).toBe(0);
    });

    it('ignores chords beyond numChords', () => {
        const cm: Record<string, Record<string, number>> = {
            black: { black: 10 },
        };
        const merged = mergeMatrices([cm], 3);
        expect(merged.black).toBeUndefined();
    });
});

describe('calculateCoefficients', () => {
    it('returns uniform weights when all chords are below threshold', () => {
        const matrix: Record<string, Record<string, number>> = {
            red: { red: 0, yellow: 0 },
            yellow: { red: 0, yellow: 0 },
        };
        const coeffs = calculateCoefficients(matrix);
        expect(coeffs[0]).toBeCloseTo(0.5);
        expect(coeffs[1]).toBeCloseTo(0.5);
    });

    it('gives higher weight to frequently confused chords', () => {
        const matrix: Record<string, Record<string, number>> = {
            red: { red: 3, yellow: 7, blue: 0 },
            yellow: { red: 0, yellow: 10, blue: 0 },
            blue: { red: 0, yellow: 0, blue: 10 },
        };
        const coeffs = calculateCoefficients(matrix, 5.0, 1.5, 5);
        expect(coeffs[0]).toBeGreaterThan(coeffs[1]);
        expect(coeffs[0]).toBeGreaterThan(coeffs[2]);
    });

    it('coefficients sum to 1', () => {
        const matrix: Record<string, Record<string, number>> = {
            red: { red: 8, yellow: 2, blue: 1 },
            yellow: { red: 1, yellow: 9, blue: 0 },
            blue: { red: 0, yellow: 1, blue: 10 },
        };
        const coeffs = calculateCoefficients(matrix, 5.0, 1.5, 5);
        const total = coeffs.reduce((a, b) => a + b, 0);
        expect(total).toBeCloseTo(1.0, 5);
    });

    it('enforces minimum coefficient values', () => {
        const matrix: Record<string, Record<string, number>> = {
            red: { red: 100, yellow: 0, blue: 0 },
            yellow: { red: 50, yellow: 5, blue: 50 },
            blue: { red: 50, yellow: 50, blue: 5 },
        };
        const coeffs = calculateCoefficients(matrix, 5.0, 1.5, 5);
        const minValue = 1 / (10 + 3);
        for (const c of coeffs) {
            expect(c).toBeGreaterThanOrEqual(minValue - 1e-10);
        }
    });

    it('gives newest chord (last) a higher minimum weight', () => {
        const matrix: Record<string, Record<string, number>> = {
            red: { red: 10, yellow: 0, blue: 0 },
            yellow: { red: 0, yellow: 10, blue: 0 },
            blue: { red: 0, yellow: 0, blue: 0 },
        };
        const coeffs = calculateCoefficients(matrix, 5.0, 1.5, 5);
        expect(coeffs[2]).toBeCloseTo(1 / 3, 5);
    });
});
