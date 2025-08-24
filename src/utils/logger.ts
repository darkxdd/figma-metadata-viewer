// File operations removed for browser environment

export const Logger = {
  isHTTP: false,
  log: (...args: any[]) => {
    if (Logger.isHTTP) {
      console.log("[INFO]", ...args);
    } else {
      console.error("[INFO]", ...args);
    }
  },
  error: (...args: any[]) => {
    console.error("[ERROR]", ...args);
  },
};

export function writeLogs(name: string, value: any): void {
  // File logging not available in browser environment
  try {
    Logger.log(`Debug data for ${name}:`, JSON.stringify(value, null, 2));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log(`Failed to process debug data for ${name}: ${errorMessage}`);
  }
}