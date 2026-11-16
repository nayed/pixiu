// Messages from the popup to the background worker, which is the only writer of the pet.

/** Asks for a fresh usage read. */
export const POLL_NOW = "poll-now";
/** Names or renames the pet. Sent as `{ type: NAME_PET, name }`. */
export const NAME_PET = "name-pet";
/** Replaces the pet with one from a backup file. Sent as `{ type: RESTORE_BACKUP, backup }`. */
export const RESTORE_BACKUP = "restore-backup";
