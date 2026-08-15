export {};

declare global {
  interface Window {
    yatharth?: {
      pickBackupFolder: () => Promise<string | null>;
    };
  }
}
