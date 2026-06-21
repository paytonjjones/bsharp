export function normalRandom(mean = 0, stdev = 1): number {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

export function clip(n: number, low: number, high: number): number {
    return Math.min(Math.max(n, low), high);
}

export function sum(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0);
}

export function cumulativeSum(arr: number[]): number[] {
    const out: number[] = [];
    let acc = 0;
    for (const value of arr) {
        acc += value;
        out.push(acc);
    }
    return out;
}

export function randomElem<T>(arr: T[], weights?: number[]): T {
    if (arr.length === 0) {
        throw new Error('randomElem requires a non-empty array');
    }
    if (weights === undefined) {
        return arr[Math.floor(Math.random() * arr.length)]!;
    } else {
        const cumWeights = cumulativeSum(weights);
        const number = Math.random();
        for (const [index, value] of arr.entries()) {
            if (number <= cumWeights[index]!) {
                return value;
            }
        }
        return arr[arr.length - 1]!;
    }
}

export function randomDuration(mean = 2, stdev = 0.3, min = 1.0, max = 2.5): number {
    return clip(normalRandom(mean, stdev), min, max);
}

export function padNumber(value: number, padding: number): string {
    return String(value).padStart(padding, '0');
}

export function formatDate(d: Date): string {
    return d.getFullYear() + "-" +
        padNumber(d.getMonth() + 1, 2) + "-" +
        padNumber(d.getDate(), 2);
}

export function formatDatetime(dt: Date, offset = false): string {
    let out = formatDate(dt) + " " + padNumber(dt.getHours(), 2) + ":" +
        padNumber(dt.getMinutes(), 2);
    if (offset) {
        let tzOffset = dt.getTimezoneOffset();
        const sign = (tzOffset < 0) ? "-" : "+";
        tzOffset = Math.abs(tzOffset);
        const tzHours = padNumber(Math.floor(tzOffset / 60), 2);
        const tzMinutes = padNumber(tzOffset % 60, 2);
        out += sign + tzHours + ":" + tzMinutes;
    }
    return out;
}

export function getCurrentTimestamp(): number {
    return Date.now() / 1000;
}

export function validInt(s: string): boolean {
    return parseInt(s) === Number(s);
}
