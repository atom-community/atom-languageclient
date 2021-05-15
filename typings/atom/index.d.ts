/* eslint-disable no-shadow, @typescript-eslint/no-unused-vars */
import { Point, Notification, NotificationOptions, TextEditor } from "atom"

// NOTE: due to a bug in how TypeScript resolves ambient augments,
// need to be more specific here for TextEditor to keep its "class"
// status and not be demoted to "interface". Should revert this
// once the issue is fixed.
// This is the same for all the following code

declare module "atom/src/text-editor" {
  interface TextEditor {
    getNonWordCharacters(position: Point): string
    destroy(): void
  }
}

declare module "atom/src/notification" {
  /** Non-public Notification api */
  interface Notification {
    isDismissed?: () => boolean
    getOptions?: () => NotificationOptions | null
  }
}

declare module "atom/src/config" {
  interface Config {
    get<T extends "atom-i18n.locale">(key: T): string
  }
}

declare module "atom/linter" {
  interface Message {
    key?: string
  }
}
