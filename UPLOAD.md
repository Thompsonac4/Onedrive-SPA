# Upload Handling & Modals (`src/upload.jsx`)

This document explains the fixes made to the file upload flow and its modals,
why they were needed, and how the pieces fit together.

## Overview

`UploadButtons` lets a signed-in user pick files, choose a destination folder,
and upload them to OneDrive/SharePoint via the Microsoft Graph API. The upload
now runs several files at once, survives individual failures, and shows a
dedicated progress modal followed by a result modal.

## Problems that were fixed

### 1. Only ~5 files would upload
**Cause:** the original loop `throw`-ew on the first file that returned a
non-OK response, which aborted the entire batch. Any file after the first
failure never uploaded.

**Fix:** each file is uploaded by `uploadOne`, which **catches its own errors**
and returns `{ name, ok }` instead of throwing. One bad file can no longer stop
the rest.

```js
const uploadOne = async (file, accessToken) => {
  const url = `${pathManager.uploadPath}/${encodeURIComponent(file.name)}:/content`;
  try {
    const response = await fetch(url, {
      method: "PUT",
      body: file,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": file.type || "application/octet-stream",
      },
    });
    if (!response.ok) throw new Error(`Graph returned ${response.status}`);
    return { name: file.name, ok: true };
  } catch (err) {
    console.error("Upload failed:", file.name, err);
    return { name: file.name, ok: false };
  }
};
```

### 2. Uploads were slow
**Causes:**
- Files uploaded strictly **one at a time** (sequential `await`).
- `imagesChanged` was dispatched **after every file**, so the gallery reloaded
  repeatedly mid-upload, competing for the mobile connection.

**Fixes:**
- **Concurrency pool:** up to `CONCURRENCY = 4` files upload at once via a shared
  queue and a small set of workers. This is much faster than sequential while
  not overwhelming a mobile connection.
- **Single refresh:** `imagesChanged` is dispatched **once**, after all uploads
  finish.

```js
const CONCURRENCY = 4;
const queue = [...files];

const worker = async () => {
  while (queue.length > 0) {
    const file = queue.shift();
    const result = await uploadOne(file, accessToken);
    if (!result.ok) failed.push(result.name);
    done += 1;
    setProgress({ done, total: files.length });
  }
};

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker)
);

window.dispatchEvent(new CustomEvent("imagesChanged")); // once, at the end
```

### 3. Files with spaces / special characters could fail
**Cause:** the file name was interpolated straight into the Graph URL, so names
with spaces or reserved characters produced a malformed URL.

**Fix:** `encodeURIComponent(file.name)` is used when building the upload URL
(see `uploadOne` above).

### 4. Missing token wasn't handled
**Cause:** `getAccessToken()` can return `null` when a login/redirect is in
progress; the old code would send `Bearer null`.

**Fix:** if there's no token, the upload stops cleanly and shows the failure
result modal.

```js
const accessToken = await authService.getAccessToken();
if (!accessToken) {
  setUploading(false);
  setShowUploading(false);
  setSuccessState("Failed");
  setShowSuccess(true);
  return;
}
```

## Modal flow

There are three modals, shown in sequence:

1. **Selection modal** (`show`)
   - Lists the selected file names.
   - Contains `DateSelection` to pick the destination folder.
   - Footer: **Close** and **Upload** (both disabled while `uploading`).

2. **Progress modal** (`showUploading`)
   - Opens when Upload is clicked; the selection modal closes at the same time.
   - Title: **“Uploading to {folderName}”** where the name comes from
     `pathManager.uploadFolderName`.
   - Body: **“Uploading X of N files…”** plus a progress bar bound to
     `progress.done / progress.total`.
   - **No close (x) button** and **cannot be dismissed** while uploading:
     `backdrop="static"` and `keyboard={false}` prevent accidental cancel.

3. **Result modal** (`showSuccess`)
   - Opens when the upload finishes and the progress modal closes.
   - Title reflects the outcome:
     - `Success` → “Upload Success”
     - `Partial` → “Some Files Failed” (lists the failed file names)
     - `Failed` → “Failed to Upload”
   - Has a normal **Close** button.

```
Select files → [Selection modal] --Upload--> [Progress modal] --done--> [Result modal]
```

## State reference

| State | Purpose |
| --- | --- |
| `selectedFiles` | Files chosen by the user (accumulates across multiple picks) |
| `fileNames` | Newline-joined names shown in the selection modal |
| `show` | Selection modal visibility |
| `showUploading` | Progress modal visibility |
| `uploading` | True while an upload batch is running (disables buttons) |
| `progress` | `{ done, total }` used for the counter and progress bar |
| `uploadFolderName` | Destination folder name shown in the progress modal |
| `showSuccess` | Result modal visibility |
| `successState` | `"Success" \| "Partial" \| "Failed"` |
| `failedNames` | Names of files that failed (listed in the result modal) |

## How the outcome is decided

```js
setSuccessState(
  failed.length === 0
    ? "Success"
    : failed.length === files.length
    ? "Failed"
    : "Partial"
);
```

- **Success:** every file uploaded.
- **Partial:** some succeeded, some failed (failed names are listed).
- **Failed:** all files failed (or no token was available).

## Tunable values

- `CONCURRENCY` (default `4`) — how many files upload at once. Raise for faster
  uploads on strong connections; lower for weak mobile connections.

## Notes & limitations

- **Graph simple upload** (`PUT .../content`) is used, which is intended for
  smaller files. Very large files (hundreds of MB) would need an upload session
  with chunking — not currently implemented.
- The **iOS/Safari photo picker** may itself limit how many items can be picked
  at once in a single selection. Because `selectedFiles` accumulates, the user
  can tap the file button multiple times to add more before pressing Upload.
- Close-of-tab does not cancel in-flight uploads; the progress modal blocks
  dismissal until the batch completes.
