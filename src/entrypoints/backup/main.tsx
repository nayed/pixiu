// The backup page: saves the pet to a file and restores it from one. It is a page of its own
// because choosing a file opens a dialog, and the popup closes as soon as it loses focus.

import { render } from "preact";
import { BackupSection } from "@/ui/Backup";
import "@/ui/tools.css";

const root = document.getElementById("app");
if (root) {
  render(
    <main>
      <div class="controls">
        <h1>Pixiu backup</h1>
        <BackupSection />
      </div>
    </main>,
    root,
  );
}
