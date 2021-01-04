export { };
declare module 'atom' {
  interface TextEditor {
    getNonWordCharacters(position: Point): string;
  }

  interface Config {
    get<T extends 'atom-i18n.locale'>(key: T): string;
  }

  /** Non-public Notification api */
  interface NotificationExt extends Notification {
    isDismissed?: () => boolean;
    getOptions?: () => NotificationOptions | null;
  }
}
