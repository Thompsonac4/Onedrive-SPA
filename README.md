# Onedrive-SPA

A Microsoft 365–integrated web app for browsing and uploading jobsite documents straight from OneDrive/SharePoint. Built for real-world use by an active company.

**Designed and Built by:**  
[Austin Thompson](https://github.com/thompsonac4) & [Michael Cornelison](https://github.com/mariosoniczero)

---

## Description

Field and office teams often have jobsite photos, reports, and spreadsheets scattered across OneDrive folders. **Jobsite Files** gives them a single, touch-friendly interface to sign in with their Microsoft account, select a shared jobsite, browse its folders, and instantly view every file in that location — no digging through the OneDrive web UI for day-to-day work.

This project is designed for a real work environment and a specific company. It integrates directly with their production Microsoft 365 tenant (permissions, drive layout, and end-user workflows included).

The production drive may organize folders under inaccessible parents:

```text
Jobs
  └── 2026 Jobs
        ├── 2026-60  ← shared directly with a user
        └── 2026-32  ← shared directly with a user
              └── Subfolders
                    └── Files
```

Users do not need access to `Jobs` or `2026 Jobs`. Microsoft Search locates jobsite folders shared directly with them, and the app opens each result by its drive and item IDs.

---

## Highlights

- **Secure Microsoft sign-in** using MSAL with a full-page redirect flow and a dedicated redirect-bridge page (`auth.html`), wrapped in a reusable `AuthService` class that handles login, logout, and silent token refresh.
- **Shared jobsite discovery** through the Microsoft Search API, including folders whose parent hierarchy the user cannot access.
- **Live OneDrive/SharePoint integration** via Microsoft Graph — jobsites, nested folders, and files are loaded dynamically.
- **Universal file previews:** images and videos render inline; PDFs and Word/Excel/PowerPoint use the Graph preview endpoint instead of force-downloading to the browser.
- **Horizontal gallery** that loads every file in a folder and scrolls sideways for large sets, with a full-screen lightbox for focused viewing.
- **Upload, create date folders, rename, and delete** without leaving the app.
- **Mobile-first navigation** with large controls, two-column jobsite tabs, breadcrumb highlighting, bottom-left back navigation, and a full-width jobsite switch button.
- **Production-minded config:** all tenant and client IDs live in environment variables, kept out of source control.

---

## Tech Stack

React 19 · Vite · `@azure/msal-browser` + `@azure/msal-react` · Microsoft Graph API · React-Bootstrap · MUI · React DatePicker

---

## Interface

The current interface is designed for phones and tablets used in the field:

- Jobsites appear as large, two-column tabs for quick selection.
- Tabs and action buttons use consistent, touch-friendly sizing.
- The active folder is highlighted in blue in the path heading.
- **Select New Jobsite** is a large blue button above the folder content.
- **Back** appears at the bottom-left only after entering a subfolder.
- **Create New Folder** remains at the bottom-right of the folder card.
- File thumbnails scroll horizontally without making the page scroll sideways.

<!-- Add an updated jobsite selection screenshot at Photos/JobsiteSelection.png -->
<img src="Photos/JobsiteSelection.png" alt="Two-column jobsite selection tabs" width="300" />

<!-- Add an updated folder navigation screenshot at Photos/FolderNavigation.png -->
<img src="Photos/FolderNavigation.png" alt="Folder navigation with the jobsite switch, back, and create folder buttons" width="300" />

---

## Features & Functions

### 1. Microsoft sign-in (`login-button.jsx`, `authService.js`, `auth.html`)

Users sign in with their work Microsoft account. Auth uses MSAL’s redirect flow through `/auth.html`, then returns to the app. Tokens are refreshed silently for Graph calls.

<img src="Photos/HomeScreen.png" alt="Home Screen" width="250" />

---

### 2. Select a shared jobsite and browse folders

`jobsite-dropdown.jsx` sends a POST request to the Microsoft Search API and filters the results to folders whose names follow the jobsite format, such as `2026-60`. Results are displayed as large two-column tabs.

Selecting a jobsite opens it directly through its `driveId` and item `id`, so the app never needs to traverse inaccessible parent folders. `subfolder-tabs.jsx` then displays the selected folder's children as responsive tabs.

Navigation state is coordinated through `pathManager.js` and custom window events. The breadcrumb shows the current path, the bottom-left **Back** button returns to the previous folder, and the large blue **Select New Jobsite** button resets the flow.

<!-- Add a current breadcrumb/navigation screenshot at Photos/FolderBreadcrumb.png -->
<img src="Photos/FolderBreadcrumb.png" alt="Selected jobsite and folder breadcrumb" width="300" />


### 3. File gallery (`imagecontainer.jsx`, `filethumbnail.jsx`, `load-images.jsx`)

Once a date folder is selected, every file loads into a horizontal thumbnail strip. Files are classified by extension (image, video, PDF, Word, Excel, PowerPoint) and previewed accordingly.


### 4. Photo viewer (lightbox)

Click a photo thumbnail to open the full-screen viewer (`fileviewer.jsx` + `fileslide.jsx`). Navigate with on-screen arrows or keyboard (← → Esc). Images are loaded via Graph and shown inline.

<img src="Photos/PhotoLightbox.png" alt="Photo viewer lightbox" width="250" />

---

### 5. Video viewer (lightbox)

Videos use a streamable OneDrive/SharePoint download URL (not a full blob download), then play with native HTML5 controls in the same lightbox. Only one file is mounted at a time so playback stays stable next to Office previews.


<img src="Photos/VideoPlayback.png" alt="Video viewer with controls" width="250" />

---

### 6. Office & PDF previews

PDFs and Office documents open through Microsoft Graph’s **preview** action and render in an iframe (Office Online–style viewer) instead of triggering a browser download.

<p float="left">
   <img src="Photos/Word.png" alt="PDF or Office document preview" width="250" />
   <img src="Photos/Excel.png" alt="Excel document preview" width="250" />
</p>
---

### 7. Upload files (`upload.jsx`, `upload-session.jsx`)

Users pick files, choose an existing date folder (or create one), and upload with progress and result modals.

- **Small files** → simple Graph `PUT …/content`
- **Large files** (e.g. videos) → `createUploadSession` + chunked upload with retries
- Several files can upload concurrently without one failure stopping the batch

<p float="left">
   <img src="Photos/UploadSelection.png" alt="Upload — select files and destination folder" width="250" />
   <img src="Photos/FilesUploading.png" alt="Upload — progress" width="250" />
</p>

---

### 8. Create a new calendar date folder (`calendar-selection.jsx`, `create-folder.js`)

The **Create New Folder** action is positioned at the bottom-right of the folder container. It opens a calendar where the user chooses a day. The app builds a folder name (`MM-D-YY`) and creates it through Microsoft Graph so uploads and browsing can target it immediately.


<img src="Photos/CalendarFolder.png" alt="Calendar — pick a new date" width="250" />


---

### 9. Delete files (`delete-item.js`, viewer + `App.jsx` confirmation)

From the file viewer, users can delete the current file. Graph deletes the drive item; the app shows a confirmation/status modal and refreshes the gallery.


<img src="Photos/DeleteFiles.png" alt="Delete file confirmation" width="250" />

---

### 10. Rename files (`change-file-name.js`)

From the viewer edit controls, users can rename a file (extension preserved) via a Graph `PATCH` on the drive item.


<img src="Photos/ChangeName.png" alt="Rename file in the viewer" width="250" />

---

## Module map (for developers)

| Area | Main files |
| --- | --- |
| App shell | `src/App.jsx`, `src/main.jsx` |
| Auth | `src/auth/` (`authService.js`, `login-button.jsx`, `msal-config.jsx`, `auth-redirect.js`) + root `auth.html` |
| Navigation | `src/navigation/` (shared jobsite search, subfolder tabs, back navigation, calendar) |
| Paths / Graph helpers | `src/services/` (`pathmanager.js`, create/delete/rename, etc.) |
| Gallery & viewer | `src/files/` |
| Upload | `src/upload/` |

Deeper notes: [`AUTH.md`](./AUTH.md) · [`UPLOAD.md`](./UPLOAD.md)

---

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file from the template and fill in your values:

   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   | --- | --- |
   | `VITE_MSAL_CLIENT_ID` | Azure Entra SPA app (client) ID |
   | `VITE_MSAL_AUTHORITY` | Login authority (`common` or your tenant ID) |
   | `VITE_DRIVE_ID` | Graph drive id holding the jobsite folders |
   | `VITE_JOBSITES_FOLDER_ID` | Drive item id of the jobsites parent folder |
   | `VITE_JOBSITES_FOLDER_PATH` | Optional friendly path fallback |

3. In the Azure portal, register a **Single-page application** and add the redirect URI `http://localhost:5173/auth.html` (add your production URL later). Grant delegated Graph permissions: `User.Read`, `Files.ReadWrite.All`, `Sites.ReadWrite.All`.

4. Run the dev server:

   ```bash
   npm run dev
   ```

---

## Deploy to Azure Static Web Apps (GitHub)

Reuse the same Entra SPA registration and add your production redirect URI.

### 1. Entra

Under **Authentication → Single-page application**, add:

```text
https://<your-app>.azurestaticapps.net/auth.html
```

Keep `http://localhost:5173/auth.html` for local development.

### 2. Push to GitHub

Push this repo (`.env` stays git-ignored). Do **not** commit real secrets.

### 3. Create the Static Web App

Azure Portal → **Static Web Apps** → Create → connect the GitHub repo.

| Setting | Value |
| --- | --- |
| App location | `/` (or `/azure-react` if the app is in a subfolder) |
| Api location | leave empty |
| Output location | `dist` |

### 4. Build-time environment variables

Vite bakes `VITE_*` values in at **build time**. In GitHub → **Settings → Secrets and variables → Actions**, add the same `VITE_*` keys as in `.env`, then pass them into the workflow build step.

### 5. Confirm after deploy

- Open the Static Web Apps URL and sign in (`/auth.html` → `/`)
- `public/staticwebapp.config.json` is copied into `dist` so routing and `auth.html` work correctly

---

## Review

### What We Learned

Because this was built for an actual company rather than a sandbox, we had to account for a real Microsoft 365 tenant, real permissions, and non-technical end users.

The trickiest part was **authentication**: getting MSAL’s popup/redirect handshake to complete reliably (including MSAL’s redirect-bridge requirement and a Vite dependency-reload race) taught us a lot about the OAuth authorization-code flow for SPAs.

On the data side, we learned to distinguish **MSAL** (identity + tokens) from **Microsoft Graph** (the actual file operations), and how to render Office documents and stream large videos without forcing brittle full-file downloads. Large uploads needed resumable upload sessions with sensible chunk sizes and retries so real jobsite videos survive flaky connections.

Shipping delete, rename, and calendar-driven date folders pushed the app from “viewer” to a day-to-day field tool — with UI flows that stay understandable for people who live in OneDrive, not in DevTools.

---
