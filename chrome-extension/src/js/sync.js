// Sync via chrome.storage.sync — Chrome replicates it across the signed-in
// user's machines automatically. Payload is encrypted with the user's PIN,
// same CryptoManager format as import/export.
// ponytail: single 8KB item (~30-40 TOTP entries). Upgrade path if hit:
// split into s0..sN item keys — total sync quota is 100KB.
const SYNC_DATA_KEY = "syncData";
const SYNC_META_KEY = "syncMeta";

function getSyncPin() {
  return chrome.storage.local.get("syncPin").then((d) => d.syncPin || null);
}

async function pushSecrets(secrets, updatedAt) {
  const pin = await getSyncPin();
  if (!pin) return; // sync not enabled on this machine
  const payload = await CryptoManager.encrypt(secrets, pin);
  if (payload.length > 8000) {
    throw new Error("Encrypted secrets exceed the 8KB sync item limit");
  }
  await chrome.storage.sync.set({
    [SYNC_DATA_KEY]: payload,
    [SYNC_META_KEY]: { updatedAt },
  });
}

// Returns true if remote data was applied locally. Last write wins.
async function pullSecrets() {
  const pin = await getSyncPin();
  if (!pin) return false;
  try {
    const data = await chrome.storage.sync.get([SYNC_DATA_KEY, SYNC_META_KEY]);
    const meta = data[SYNC_META_KEY];
    if (!data[SYNC_DATA_KEY] || !meta) return false;
    const { secretsUpdatedAt = 0 } = await chrome.storage.local.get(
      "secretsUpdatedAt"
    );
    if (meta.updatedAt <= secretsUpdatedAt) return false;
    const secrets = await CryptoManager.decrypt(data[SYNC_DATA_KEY], pin);
    await chrome.storage.local.set({
      secrets,
      secretsUpdatedAt: meta.updatedAt,
    });
    return true;
  } catch {
    return false; // no remote data, wrong PIN, or offline — stay local
  }
}

// Drop-in replacement for chrome.storage.local.set({secrets}, cb) that also
// timestamps the write and pushes to sync (no-ops until sync is enabled).
function saveSecrets(secrets, callback) {
  const secretsUpdatedAt = Date.now();
  chrome.storage.local.set({ secrets, secretsUpdatedAt }, () => {
    pushSecrets(secrets, secretsUpdatedAt).catch((e) => {
      console.debug("Sync push failed:", e.message || e);
      if (typeof showNotification === "function") {
        showNotification("Sync failed: " + (e.message || e));
      }
    });
    callback?.();
  });
}
