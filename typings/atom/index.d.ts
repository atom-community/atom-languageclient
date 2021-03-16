import { Point, Notification, NotificationOptions, TextEditor } from "atom"

// NOTE: due to a bug in how TypeScript resolves ambient augments,
// need to be more specific here for TextEditor to keep its "class"
// status and not be demoted to "interface". Should revert this
// once the issue is fixed.
declare module "atom/src/text-editor" {
  interface TextEditor {
    getNonWordCharacters(position: Point): string
  }
}

// NOTE: same here
declare module "atom/src/notification" {
  /** Non-public Notification api */
  interface Notification {
    isDismissed?: () => boolean
    getOptions?: () => NotificationOptions | null
  }
}
