/**
 * Large-file upload via Graph createUploadSession.
 *
 * Chunk PUTs go to a SharePoint uploadUrl (tempauth). Intermediate chunks
 * return 202; the final chunk returns 200/201.
 *
 * Chunk size must be a multiple of 320 KiB (except the last chunk). Large
 * chunks (~12MB+) often die mid-transfer with TypeError: Failed to fetch
 * even when earlier chunks returned 202 — keep chunks modest and retry.
 */

const FRAGMENT_SIZE = 320 * 1024; // 320 KiB — Graph requirement
const CHUNK_SIZE = FRAGMENT_SIZE * 10; // 3.2 MiB per request (reliable on flaky links)
const MAX_RETRIES = 4;

export async function createUploadSession(folderPath, fileName, accessToken) {
  const url = `${folderPath}/${encodeURIComponent(fileName)}:/createUploadSession`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      item: {
        "@microsoft.graph.conflictBehavior": "replace",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Upload session failed: ${response.status}`);
  }

  const data = await response.json();
  return data.uploadUrl;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True when a retry of the same byte range is worth trying. */
function isRetryable(err, status) {
  if (status === 408 || status === 429 || status >= 500) return true;
  // Browser network drop / connection reset mid-PUT
  if (err && (err.name === "TypeError" || /Failed to fetch/i.test(err.message))) {
    return true;
  }
  return false;
}

/**
 * PUT one byte-range chunk, with retries for transient network / 5xx failures.
 */
async function putChunk(uploadUrl, chunk, start, end, totalSize) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(chunk.size),
          "Content-Range": `bytes ${start}-${end - 1}/${totalSize}`,
        },
        body: chunk,
      });

      // 202 = more chunks needed; 200/201 = file complete
      if (response.ok || response.status === 202) {
        return response;
      }

      const body = await response.text();
      lastError = new Error(`Chunk upload failed: ${response.status} ${body}`);

      if (!isRetryable(null, response.status) || attempt === MAX_RETRIES) {
        throw lastError;
      }
    } catch (err) {
      lastError = err;
      if (!isRetryable(err, 0) || attempt === MAX_RETRIES) {
        throw err;
      }
    }

    // Exponential backoff: 1s, 2s, 4s, 8s
    await sleep(1000 * 2 ** attempt);
  }

  throw lastError;
}

export async function uploadLargeFile(file, uploadUrl, onProgress) {
  let start = 0;

  while (start < file.size) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    await putChunk(uploadUrl, chunk, start, end, file.size);

    start = end;
    if (typeof onProgress === "function") {
      onProgress(start / file.size);
    }
  }
}
