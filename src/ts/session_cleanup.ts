import { getSessionHistory, SESSION_HISTORY_KEY, isRecent } from './state';
import { SessionStats } from './types';

export function cleanSessionHistory(): void {
    const fullHistory = getSessionHistory();

    for (const profileHistory of Object.values(fullHistory)) {
        // Remove buggy empty-key sessions
        if ((profileHistory as Record<string, unknown>)[''] !== undefined) {
            delete (profileHistory as Record<string, unknown>)[''];
        }

        for (const chord of Object.keys(profileHistory)) {
            profileHistory[chord] = profileHistory[chord]!
                .filter((o: SessionStats) =>
                    o.identifications || (!o.done && isRecent(o.updated_time))
                )
                .map((o: SessionStats) => {
                    if (o.current_chord !== chord) {
                        o.current_chord = chord;
                    }
                    return o;
                })
                .reduce((accumulator: SessionStats[], value: SessionStats) => {
                    const lastSession = accumulator[accumulator.length - 1];
                    if (lastSession === undefined ||
                        value.identifications !== lastSession.identifications ||
                        value.start_time !== lastSession.start_time) {
                        accumulator.push(value);
                    }
                    return accumulator;
                }, [] as SessionStats[]);
        }
    }

    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(fullHistory));
}
