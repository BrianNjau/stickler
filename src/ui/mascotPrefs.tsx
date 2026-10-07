import { createContext, useContext, type ReactNode } from 'react';

interface MascotPrefs {
  /** user_settings.snitch_intensity: 0 = the Snitch is silent everywhere, 3 = relentless. */
  snitchIntensity: number;
  /** user_settings.humour_level, 0–3. Consumed by the line picker (WP7). */
  humourLevel: number;
}

// Before sign-in (intro, sign-in) the defaults apply, matching handle_new_user's seeded row.
const MascotPrefsContext = createContext<MascotPrefs>({ snitchIntensity: 2, humourLevel: 2 });

export function MascotPrefsProvider({ value, children }: { value: MascotPrefs; children: ReactNode }) {
  return <MascotPrefsContext.Provider value={value}>{children}</MascotPrefsContext.Provider>;
}

export const useMascotPrefs = () => useContext(MascotPrefsContext);

/** False when the user has set snitch_intensity to 0. Every Snitch surface must check this. */
export const useSnitchEnabled = () => useMascotPrefs().snitchIntensity > 0;
