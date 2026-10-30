import { useSyncExternalStore } from "react";
import { python, type PythonStatus } from "./client.ts";

export function usePythonStatus(): PythonStatus {
  return useSyncExternalStore(python.subscribe, python.getStatus);
}
