import { Point, Notification, NotificationOptions, TextEditor } from "atom"

declare module "atom" {
  interface TextEditorExt extends TextEditor {
    getNonWordCharacters(position: Point): string
  }

  /** Non-public Notification api */
  interface NotificationExt extends Notification {
    isDismissed?: () => boolean
    getOptions?: () => NotificationOptions | null
  }
}
