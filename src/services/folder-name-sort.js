/**
 * Folder names created from the calendar use en-US MM-DD-YY (e.g. 07-30-26).
 * Date folders sort chronologically; everything else sorts alphabetically.
 */
const DATE_FOLDER_PATTERN = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/;

export function parseFolderDate(name) {
  const match = String(name || "").trim().match(DATE_FOLDER_PATTERN);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = Number(match[3]);

  if (year < 100) {
    year += 2000;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const timestamp = new Date(year, month - 1, day).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function compareFolderNames(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  const dateLeft = parseFolderDate(left);
  const dateRight = parseFolderDate(right);

  if (dateLeft !== null && dateRight !== null) {
    // Newest dates first, then older ones.
    return dateRight - dateLeft;
  }

  if (dateLeft !== null) return -1;
  if (dateRight !== null) return 1;

  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortFoldersByName(folders, nameKey = "name") {
  return [...folders].sort((a, b) =>
    compareFolderNames(a[nameKey], b[nameKey])
  );
}
