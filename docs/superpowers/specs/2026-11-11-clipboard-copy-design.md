# Design Spec: Task & Folder Copy to Clipboard

## 1. Intent and Why
Allow users to quickly copy a single task or an entire folder's contents (as well as selected batches) as clean, markdown-friendly text to the system clipboard, making it seamless to share tasks or export agendas into Slack, docs, notes, or emails.

## 2. Goals & Non-Goals
- **Goals**:
  - One-click copy for individual tasks via row action and inside `TaskDetailModal`.
  - One-click copy for an entire folder via the main folder header and sidebar folder row.
  - One-click "Copy Selected" in `BatchActionBar` when multi-selection mode is active.
  - Well-formatted plain text / markdown output (status checkbox `[ ]` / `[x]`, title, priority, due date, folder name, and indented notes).
  - Clear visual feedback via temporary toast alert ("Task copied", "X tasks copied from [Folder]").
- **Non-Goals**:
  - In-app task duplication / cloning (database record cloning).
  - Rich HTML clipboard MIME data (plain text formatted in markdown satisfies cross-app pasting).

## 3. Approaches Considered
- **Approach 1 (Selected)**: Comprehensive Copy Experience
  - Adds copy to individual task items, TaskDetailModal, main workspace folder header, sidebar folder items, and BatchActionBar.
  - Uses clean markdown-compatible checklist format.
  - *Trade-off*: Touches a few more components, but provides discoverable and cohesive UX.
- **Approach 2**: Minimal Hover Icons Only
  - Only hover icons on TaskItem and Sidebar list items.
  - *Trade-off*: Harder to discover, no folder-level copy when viewing the folder workspace, no batch copy.

## 4. Detailed Component Changes
1. **Clipboard Formatter (`src/App.tsx` or helper)**:
   - `formatTaskForClipboard(task, listTitle?)`:
     ```text
     - [ ] Review quarterly budget (Urgent priority · Due Nov 15 at 14:00)
       Notes: Compare with Q3 numbers
     ```
   - `formatFolderForClipboard(folderTitle, tasks)`:
     ```text
     📁 Work (3 tasks)

     - [ ] Task 1 (High priority)
     - [x] Task 2 (Completed)
     ```
2. **`TaskItem.tsx`**:
   - Copy button in hover action bar invoking `onCopy(task)`.
3. **`TaskDetailModal.tsx`**:
   - Add a "Copy" button in the modal header / footer next to Delete/Save so users can copy the task while reading or editing it.
4. **Folder Header (`src/App.tsx`)**:
   - In `renderMainTaskWorkspace()` when `currentView === 'list' && activeList`, show a "Copy Folder" button with `Copy` icon and task count next to the title.
5. **Sidebar (`src/components/Sidebar.tsx`)**:
   - Ensure the copy icon button on each list item triggers copying the folder's tasks.
6. **`BatchActionBar.tsx`**:
   - Add a "Copy Selected" button that copies the selected subset of tasks formatted as a list.
7. **Feedback Toast (`src/App.tsx`)**:
   - Floating badge displaying confirmation message for ~2 seconds.
