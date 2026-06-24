import { spawnSync } from 'node:child_process';

export interface ProbeResult {
    durationSec: number | null;
    codecName: string | null;
    sampleRate: number | null;
    channels: number | null;
}

export function assertCommandOnPath(command: string): void {
    const result = spawnSync(command, ['-version'], { encoding: 'utf8' });
    if (result.status !== 0) {
        throw new Error(`${command} is required on PATH`);
    }
}

export function runCommand(command: string, args: string[]): void {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
    }
}

export function probeAudio(inputPath: string): ProbeResult {
    const result = spawnSync('ffprobe', [
        '-v', 'error',
        '-select_streams', 'a:0',
        '-show_entries', 'stream=codec_name,sample_rate,channels:format=duration',
        '-of', 'json',
        inputPath,
    ], { encoding: 'utf8' });

    if (result.status !== 0) {
        throw new Error(`ffprobe ${inputPath} failed:\n${result.stderr || result.stdout}`);
    }

    const parsed = JSON.parse(result.stdout) as {
        streams?: { codec_name?: string; sample_rate?: string; channels?: number }[];
        format?: { duration?: string };
    };
    const stream = parsed.streams?.[0];
    return {
        durationSec: parsed.format?.duration ? Number(parsed.format.duration) : null,
        codecName: stream?.codec_name ?? null,
        sampleRate: stream?.sample_rate ? Number(stream.sample_rate) : null,
        channels: stream?.channels ?? null,
    };
}
