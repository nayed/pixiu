import { useState } from "preact/hooks";
import { clockToMinutes, minutesToClock } from "@/lib/format";
import { RULES } from "@/lib/pet/config";
import type { PetPopupProps } from "./PetPopup";

/** Renaming and sleeping hours. Nothing else in settings is designed yet. */
export function SettingsPanel(props: PetPopupProps & { onDone: () => void }) {
  const { pet, settings, onName, onSaveSettings, onDone, backupUrl, debugUrl } = props;
  const hatched = pet.hatchedAt !== null;
  const [name, setName] = useState(pet.name ?? "");
  const [start, setStart] = useState(minutesToClock(settings.sleep.startMinute));
  const [end, setEnd] = useState(minutesToClock(settings.sleep.endMinute));

  const save = (event: Event) => {
    event.preventDefault();
    if (hatched && name.trim() && name.trim() !== pet.name) onName(name);
    const startMinute = clockToMinutes(start);
    const endMinute = clockToMinutes(end);
    if (startMinute !== null && endMinute !== null) {
      onSaveSettings({ ...settings, sleep: { startMinute, endMinute } });
    }
    onDone();
  };

  return (
    <>
      <form class="px-section" onSubmit={save}>
        {hatched && (
          <>
            <label class="px-label" for="px-rename">
              Name
            </label>
            <input
              id="px-rename"
              class="px-input"
              type="text"
              autocomplete="off"
              placeholder="Type a name"
              maxLength={RULES.maxNameLength}
              value={name}
              onInput={(event) => setName(event.currentTarget.value)}
            />
          </>
        )}

        <h2>Sleeping hours</h2>
        <div class="px-times">
          <label>
            From
            <input
              class="px-input"
              type="time"
              required
              value={start}
              onInput={(event) => setStart(event.currentTarget.value)}
            />
          </label>
          <label>
            To
            <input
              class="px-input"
              type="time"
              required
              value={end}
              onInput={(event) => setEnd(event.currentTarget.value)}
            />
          </label>
        </div>
        <p class="px-dim">Your pet doesn't get hungry while it sleeps.</p>

        <button type="submit" class="px-primary">
          Save
        </button>
      </form>
      {(backupUrl || debugUrl) && (
        <p class="px-footer px-links">
          {backupUrl && (
            <a href={backupUrl} target="_blank" rel="noreferrer">
              Back up or restore
            </a>
          )}
          {debugUrl && (
            <a href={debugUrl} target="_blank" rel="noreferrer">
              Debug page
            </a>
          )}
        </p>
      )}
    </>
  );
}
