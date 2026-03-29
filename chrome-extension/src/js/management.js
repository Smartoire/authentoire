let editingIndex = null;
let currentTOTPItem = null;
let codeTimerInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("Management page loaded");
  renderTOTPList();

  // Handle form submission
  document
    .getElementById("totp-form")
    .addEventListener("submit", handleFormSubmit);

  // Handle add button
  document
    .getElementById("add-new-btn")
    .addEventListener("click", showAddDialog);

  // Handle close button
  document.getElementById("close-btn").addEventListener("click", hideDialog);

  // Handle cancel button
  document.getElementById("cancel-btn").addEventListener("click", hideDialog);

  // Handle close code button
  document
    .getElementById("close-code-btn")
    .addEventListener("click", hideCodeDialog);

  // Handle search input
  document
    .getElementById("search-input")
    .addEventListener("input", handleSearch);

  // Handle export button
  document.getElementById("export-btn").addEventListener("click", handleExport);

  // Handle import button
  document.getElementById("import-btn").addEventListener("click", handleImport);

  // Handle ESC key to close modals
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const editDialog = document.getElementById("edit-dialog");
      const codeDialog = document.getElementById("code-dialog");

      if (!editDialog.classList.contains("hidden")) {
        hideDialog();
      }

      if (!codeDialog.classList.contains("hidden")) {
        hideCodeDialog();
      }
    }
  });

  // Handle QR button
  const qrBtn = document.getElementById("qr-btn");
  const qrFileInput = document.getElementById("qr-file-input");

  qrBtn.onclick = () => {
    console.log("QR button clicked - triggering file upload");
    qrFileInput.click();
  };

  qrFileInput.onchange = (event) => {
    console.log("File input changed:", event.target.files);
    handleFileUpload(event);
  };
});

function renderTOTPList() {
  chrome.storage.local.get("secrets", (data) => {
    const secrets = data.secrets || [];
    const list = document.getElementById("totp-list");
    list.innerHTML = "";

    if (secrets.length === 0) {
      list.innerHTML =
        '<p style="text-align: center; color: #666;">No TOTP accounts found. Add your first one!</p>';
      return;
    }

    // Get search term
    const searchTerm = document
      .getElementById("search-input")
      .value.toLowerCase()
      .trim();

    // Filter secrets based on search term
    const filteredSecrets = secrets.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(searchTerm);
      const usernameMatch =
        item.username && item.username.toLowerCase().includes(searchTerm);
      return titleMatch || usernameMatch;
    });

    // Sort by title, then username
    filteredSecrets.sort((a, b) => {
      const titleCompare = a.title.localeCompare(b.title);
      if (titleCompare !== 0) return titleCompare;

      // If titles are the same, sort by username
      const aUsername = a.username || "";
      const bUsername = b.username || "";
      return aUsername.localeCompare(bUsername);
    });

    if (filteredSecrets.length === 0 && searchTerm) {
      list.innerHTML =
        '<p style="text-align: center; color: #666;">No TOTP accounts found matching "' +
        searchTerm +
        '"</p>';
      return;
    }

    filteredSecrets.forEach((item, filteredIndex) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "manage-item";

      const headerDiv = document.createElement("div");
      headerDiv.className = "item-header";

      const titleDiv = document.createElement("div");
      titleDiv.className = "item-title";
      titleDiv.textContent = item.title;

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "item-actions";

      const editBtn = document.createElement("button");
      editBtn.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z"/></svg>';
      editBtn.title = "Edit";
      editBtn.onclick = () => {
        // Find the original index in the unsorted secrets array
        const originalIndex = secrets.findIndex(
          (secret) =>
            secret.secret === item.secret &&
            secret.title === item.title &&
            secret.username === item.username
        );
        editTOTP(originalIndex);
      };

      const showCodeBtn = document.createElement("button");
      showCodeBtn.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
      showCodeBtn.title = "Show Code";
      showCodeBtn.className = "show-code-btn";
      showCodeBtn.onclick = () => showTOTPCode(item);

      const duplicateBtn = document.createElement("button");
      duplicateBtn.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" width="16" height="16"><path d="M16 1H4c-1.11 0-2 .89-2 2v14h2V3h12v14h2V3c0-1.11-.89-2-2zM8 7h8v2H8V7zm0 4h8v2H8v-2zm0 4h8v2H8v-2z"/></svg>';
      duplicateBtn.title = "Duplicate";
      duplicateBtn.className = "duplicate-btn";
      duplicateBtn.onclick = () => duplicateTOTP(item);

      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
      deleteBtn.title = "Delete";
      deleteBtn.className = "delete-btn";
      deleteBtn.onclick = () => deleteTOTP(index);

      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(showCodeBtn);
      actionsDiv.appendChild(duplicateBtn);
      actionsDiv.appendChild(deleteBtn);

      headerDiv.appendChild(titleDiv);
      headerDiv.appendChild(actionsDiv);

      const detailsDiv = document.createElement("div");
      detailsDiv.className = "item-details";

      let details = "";
      if (item.username) {
        details += `${item.username}<br>`;
      }
      // Secret is hidden for security

      detailsDiv.innerHTML = details || "<em>No additional details</em>";

      const prefixesDiv = document.createElement("div");
      prefixesDiv.className = "item-prefixes";
      if (item.prefixes && item.prefixes.length > 0) {
        prefixesDiv.innerHTML = `${item.prefixes.join(", ")}`;
      } else {
        prefixesDiv.innerHTML = "No prefixes (shows on all sites)";
      }

      itemDiv.appendChild(headerDiv);
      itemDiv.appendChild(detailsDiv);
      itemDiv.appendChild(prefixesDiv);
      list.appendChild(itemDiv);
    });
  });
}

function showAddDialog() {
  editingIndex = null;
  document.getElementById("dialog-title").textContent = "Add TOTP";
  document.getElementById("totp-form").reset();
  document.getElementById("edit-dialog").classList.remove("hidden");
}

function editTOTP(index) {
  chrome.storage.local.get("secrets", (data) => {
    const secrets = data.secrets || [];
    const item = secrets[index];

    editingIndex = index;
    document.getElementById("dialog-title").textContent = "Edit TOTP";
    document.getElementById("title").value = item.title;
    document.getElementById("username").value = item.username || "";
    document.getElementById("secret").value = item.secret;
    document.getElementById("prefixes").value = item.prefixes
      ? item.prefixes.join("\n")
      : "";
    document.getElementById("edit-dialog").classList.remove("hidden");
  });
}

function duplicateTOTP(item) {
  editingIndex = null; // Ensure we're adding, not editing
  document.getElementById("dialog-title").textContent = "Add TOTP";
  document.getElementById("title").value = item.title;
  document.getElementById("username").value = ""; // Leave empty for user to fill
  document.getElementById("secret").value = ""; // Leave empty for user to fill
  document.getElementById("prefixes").value = item.prefixes
    ? item.prefixes.join("\n")
    : "";
  document.getElementById("edit-dialog").classList.remove("hidden");
}

function hideDialog() {
  document.getElementById("edit-dialog").classList.add("hidden");
  document.getElementById("totp-form").reset();
  editingIndex = null;
}

function handleFormSubmit(event) {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const username = document.getElementById("username").value.trim();
  const secret = document
    .getElementById("secret")
    .value.trim()
    .toUpperCase()
    .replace(/\s/g, "");
  const prefixesText = document.getElementById("prefixes").value.trim();

  if (!title || !secret) {
    alert("Title and secret are required!");
    return;
  }

  // Parse URL prefixes
  const prefixes = prefixesText
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const newEntry = {
    title,
    username: username || "",
    secret,
    prefixes,
    enabled: true
  };

  chrome.storage.local.get("secrets", (data) => {
    const secrets = data.secrets || [];

    // Check for duplicate secret
    const duplicate = secrets.find(
      (item, index) =>
        item.secret.toUpperCase().replace(/\s/g, "") === secret &&
        index !== editingIndex
    );

    if (duplicate) {
      alert(`This TOTP code already exists with title: "${duplicate.title}"`);
      return;
    }

    if (editingIndex !== null) {
      // Update existing entry
      secrets[editingIndex] = newEntry;
      showNotification("TOTP updated successfully!");
    } else {
      // Add new entry
      secrets.push(newEntry);
      showNotification("TOTP added successfully!");
    }

    chrome.storage.local.set({ secrets }, () => {
      hideDialog();
      renderTOTPList();
    });
  });
}

function deleteTOTP(index) {
  if (
    confirm(
      "Are you sure you want to delete this TOTP? This action cannot be undone."
    )
  ) {
    chrome.storage.local.get("secrets", (data) => {
      const secrets = data.secrets || [];
      secrets.splice(index, 1);
      chrome.storage.local.set({ secrets }, () => {
        renderTOTPList();
        showNotification("TOTP deleted successfully!");
      });
    });
  }
}

function handleSearch() {
  renderTOTPList();
}

function handleExport() {
  chrome.storage.local.get("secrets", (data) => {
    const secrets = data.secrets || [];

    if (secrets.length === 0) {
      alert("No TOTP accounts to export!");
      return;
    }

    // Prompt for PIN
    const pin = prompt("Enter a PIN to encrypt your data:");
    if (!pin || pin.length < 4) {
      alert("PIN must be at least 4 characters!");
      return;
    }

    try {
      const encryptedData = CryptoManager.encrypt(secrets, pin);
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const filename = `authentoire-backup-${timestamp}.enc`;

      exportToFile(encryptedData, filename);
      showNotification("Data exported successfully!");
    } catch (error) {
      alert("Failed to export data: " + error.message);
    }
  });
}

function handleImport() {
  // Prompt for PIN
  const pin = prompt("Enter the PIN to decrypt your data:");
  if (!pin || pin.length < 4) {
    alert("PIN must be at least 4 characters!");
    return;
  }

  importFromFile()
    .then((encryptedData) => {
      try {
        const secrets = CryptoManager.decrypt(encryptedData, pin);

        chrome.storage.local.get("secrets", (data) => {
          const existingSecrets = data.secrets || [];

          // Check for duplicates
          const duplicates = [];
          secrets.forEach((newItem) => {
            const existing = existingSecrets.find(
              (item) =>
                item.secret.toUpperCase().replace(/\s/g, "") ===
                newItem.secret.toUpperCase().replace(/\s/g, "")
            );
            if (existing) {
              duplicates.push(newItem.title);
            }
          });

          if (duplicates.length > 0) {
            const confirmImport = confirm(
              `Warning: The following TOTPs already exist:\n${duplicates.join("\n")}\n\nDo you want to continue? Existing items will be skipped.`
            );
            if (!confirmImport) return;
          }

          // Filter out duplicates and merge
          const filteredNew = secrets.filter(
            (newItem) =>
              !existingSecrets.find(
                (item) =>
                  item.secret.toUpperCase().replace(/\s/g, "") ===
                  newItem.secret.toUpperCase().replace(/\s/g, "")
              )
          );

          const mergedSecrets = [...existingSecrets, ...filteredNew];

          chrome.storage.local.set({ secrets: mergedSecrets }, () => {
            renderTOTPList();
            showNotification(
              `Imported ${filteredNew.length} new TOTP accounts!`
            );
          });
        });
      } catch (error) {
        alert("Failed to import data: " + error.message);
      }
    })
    .catch((error) => {
      alert("Failed to read file: " + error.message);
    });
}

function showNotification(message) {
  // Create a simple notification
  const notification = document.createElement("div");
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ecc71;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

function showTOTPCode(item) {
  currentTOTPItem = item;
  document.getElementById("totp-title").textContent = item.title;
  document.getElementById("totp-username").textContent = item.username || "";
  document.getElementById("code-dialog").classList.remove("hidden");

  // Make the TOTP entry clickable
  const totpEntry = document.getElementById("totp-code");
  totpEntry.onclick = copyTOTPCode;

  // Start updating the code
  updateTOTPCode();
  codeTimerInterval = setInterval(updateTOTPCode, 1000);
}

function hideCodeDialog() {
  document.getElementById("code-dialog").classList.add("hidden");
  if (codeTimerInterval) {
    clearInterval(codeTimerInterval);
    codeTimerInterval = null;
  }
  currentTOTPItem = null;
}

async function updateTOTPCode() {
  if (!currentTOTPItem) return;

  try {
    const code = await generateTOTP(currentTOTPItem.secret);
    const remainingTime = 30 - (Math.floor(Date.now() / 1000) % 30);

    document.getElementById("totp-code").textContent = code;
    document.getElementById("timer-text").textContent = `${remainingTime}s`;
    document.getElementById("code-timer-progress").style.width =
      `${(remainingTime / 30) * 100}%`;

    // Add red class for last 5 seconds
    if (remainingTime <= 5) {
      document.getElementById("totp-code").style.color = "#dc3545";
    } else {
      document.getElementById("totp-code").style.color = "#2e7d32";
    }
  } catch (err) {
    console.error("Error generating TOTP code:", err);
    document.getElementById("totp-code").textContent = "Error";
  }
}

function copyTOTPCode() {
  const code = document.getElementById("totp-code").textContent;
  if (code && code !== "Error") {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        // Add visual feedback
        const totpEntry = document.getElementById("totp-entry");
        totpEntry.classList.add("copied");
        showNotification("Code copied to clipboard!");

        // Remove visual feedback after 1 second
        setTimeout(() => {
          totpEntry.classList.remove("copied");
        }, 1000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        showNotification("Failed to copy code");
      });
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  console.log("handleFileUpload called with file:", file?.name);
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    console.log("FileReader loaded - processing image");

    const img = new Image();
    img.onload = function () {
      console.log("Image loaded - dimensions:", img.width, "x", img.height);

      // Create a temporary canvas to process the image
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      try {
        const result = decodeTOTPFromImage(imageData);
        if (result) {
          console.log("QR decoded successfully:", result);
          handleQRResult(result);
        } else {
          console.log("No QR code found in image");
          showNotification("No QR code found - try a clearer image");
        }
      } catch (err) {
        console.error("Failed to read QR code:", err);
        showNotification("Failed to read QR code");
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function decodeTOTPFromImage(imageData) {
  // Use jsQR library to decode QR code from image data
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "dontInvert"
  });

  if (code) {
    console.log("QR code decoded:", code.data);
    return code.data;
  }

  // Try with inversion if first attempt fails
  const invertedCode = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "onlyInvert"
  });

  if (invertedCode) {
    console.log("QR code decoded with inversion:", invertedCode.data);
    return invertedCode.data;
  }

  console.log("No QR code found in image");
  return null;
}

function handleQRResult(uri) {
  console.log("handleQRResult called with URI:", uri);

  try {
    const url = new URL(uri);
    console.log("Parsed URL:", url);

    if (url.protocol === "otpauth:" && url.pathname.startsWith("/totp/")) {
      const params = new URLSearchParams(url.search);
      const secret = params.get("secret");
      const label = url.pathname.substring(6); // Remove '/totp/'

      console.log("Parsed TOTP data - Secret:", secret, "Label:", label);

      if (secret) {
        document.getElementById("secret").value = secret;

        if (label) {
          // Parse label to extract title and username (format: "Title:Username" or just "Title")
          const parts = label.split(":");
          if (parts.length === 2) {
            document.getElementById("title").value = parts[0].trim();
            document.getElementById("username").value = parts[1].trim();
          } else {
            document.getElementById("title").value = label.trim();
          }
        }

        console.log("Form populated successfully");
        showNotification("QR code loaded successfully!");
      }
    } else {
      console.log("Invalid URI format - not a TOTP URI");
      showNotification("Invalid QR code format");
    }
  } catch (err) {
    console.error("Error parsing QR result:", err);
    showNotification("Invalid QR code format");
  }
}
