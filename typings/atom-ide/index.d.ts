declare module 'atom-ide' {
    // atom-ide-base types for backward compatibility
    export * from "atom-ide-base/types-packages/main"

    // NotificationButton for backward compatibility (moved to "../../lib/adapters/notifications-adapter")
    export interface NotificationButton {
      text: string
    }
}
