import voicelab from "../../python/voicelab.py?raw";
import cdrs from "../../seed/data/cdrs.csv?raw";
import pods from "../../seed/data/pods.json?raw";
import prom from "../../seed/data/prom.json?raw";
import sipLog from "../../seed/data/sip.log?raw";

/** The helper module and sample data, by path relative to the user's home folder. */
export const SEED_FILES: Readonly<Record<string, string>> = {
  "voicelab.py": voicelab,
  "data/cdrs.csv": cdrs,
  "data/pods.json": pods,
  "data/prom.json": prom,
  "data/sip.log": sipLog,
};
