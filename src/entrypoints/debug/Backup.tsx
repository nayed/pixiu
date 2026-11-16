// Saves the real pet to a file and restores it from one. Removing the extension deletes its
// storage, so this is how a pet survives that.

import { useEffect, useState } from "preact/hooks";
import { browser } from "wxt/browser";
import { type Backup, createBackup, parseBackup } from "@/lib/backup";
import { RESTORE_BACKUP } from "@/lib/messages";
import { DEFAULT_SETTINGS } from "@/lib/pet/config";
import { describeView } from "@/lib/pet/describe";
import type { PetState } from "@/lib/pet/state";
import { viewPet } from "@/lib/pet/view";
import { load, onStoreChanged, type Stored } from "@/lib/store";

const describe = (pet: PetState) => describeView(viewPet(pet, new Date(), DEFAULT_SETTINGS));

function download(backup: Backup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `pixiu-backup-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function BackupSection() {
  const [stored, setStored] = useState<Stored | null>(null);
  const [chosen, setChosen] = useState<Backup | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => void load().then(setStored);
    refresh();
    return onStoreChanged(refresh);
  }, []);

  const pet = stored?.pet;

  const choose = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = ""; // Let the same file be chosen again.
    if (!file) return;
    const backup = parseBackup(await file.text());
    setChosen(backup);
    setMessage(backup ? "" : `${file.name} is not a Pixiu backup.`);
  };

  const restore = async () => {
    if (!chosen) return;
    await browser.runtime.sendMessage({ type: RESTORE_BACKUP, backup: chosen });
    setChosen(null);
    setMessage("Restored.");
  };

  return (
    <section>
      <h2>Your real pet</h2>
      <p class="headline">{pet ? describe(pet) : "No pet yet."}</p>
      <p class="detail">
        Removing the extension deletes the pet. Export it first, then import the file afterward.
      </p>

      <div class="row">
        <button
          type="button"
          class="button"
          disabled={!pet}
          onClick={() =>
            pet && download(createBackup(pet, stored?.settings, stored?.log, new Date()))
          }
        >
          Export to a file
        </button>
        <label class="button">
          Import from a file
          <input
            type="file"
            accept="application/json,.json"
            class="visually-hidden"
            onChange={(event) => void choose(event.currentTarget)}
          />
        </label>
      </div>

      {chosen && (
        <div class="notice confirm" role="alertdialog" aria-label="Replace your pet?">
          <p>Replace your pet with the one in this file? The pet you have now will be gone.</p>
          <dl>
            <dt>Now</dt>
            <dd>{pet ? describe(pet) : "No pet yet."}</dd>
            <dt>In the file</dt>
            <dd>{describe(chosen.pet)}</dd>
            <dt>Exported</dt>
            <dd>{new Date(chosen.exportedAt).toLocaleString()}</dd>
          </dl>
          <div class="row">
            <button type="button" class="button primary" onClick={() => void restore()}>
              Replace
            </button>
            <button type="button" class="button" onClick={() => setChosen(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {message && (
        <p class="detail" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
