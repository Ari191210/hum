declare const __BUILD_SHA__: string
declare const __BUILD_TIME__: string

/** Which build is running. Shown on screen and included in every diagnostics report. */
export const BUILD = { sha: __BUILD_SHA__, time: __BUILD_TIME__ }
