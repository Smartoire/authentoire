const codeList = document.getElementById("code-list");
const manageBtn = document.getElementById("manage-btn");

// Global elements
let currentTabUrl = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded - Initializing Authentoire");

  // Close extension when clicking outside
  document.addEventListener("click", (event) => {
    // Check if click is outside the popup content
    if (
      event.target === document.body ||
      event.target === document.documentElement
    ) {
      window.close();
    }
  });

  // Get current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      try {
        currentTabUrl = new URL(tabs[0].url);
        console.log("Current URL:", currentTabUrl.origin);
      } catch (err) {
        console.error("Invalid URL:", tabs[0].url, err);
        currentTabUrl = null;
      }
    } else {
      console.log("No active tab or URL available");
      currentTabUrl = null;
    }
  });

  console.log("Elements initialized:", {
    codeList,
    manageBtn
  });

  // Handle management button
  manageBtn.onclick = () => {
    console.log("Manage button clicked - opening in new tab");
    chrome.tabs.create({
      url: chrome.runtime.getURL("src/management.html")
    });
  };
});

const notification = document.getElementById("notification");

function showNotification(message) {
  notification.textContent = message;
  notification.classList.remove("hide");
  setTimeout(() => notification.classList.add("hide"), 2000);
}

async function renderCodes() {
  chrome.storage.local.get("secrets", async (data) => {
    const secrets = data.secrets || [];
    codeList.innerHTML = "";

    // Update progress bar
    const remainingTime = 30 - (Math.floor(Date.now() / 1000) % 30);
    const progress = document.getElementById("timer-progress");
    progress.style.width = `${(remainingTime / 30) * 100}%`;

    // Filter TOTPs based on current URL
    const filteredSecrets = secrets.filter((secret) => {
      if (!secret.prefixes || secret.prefixes.length === 0) {
        return true; // Show if no prefixes specified
      }

      if (!currentTabUrl) {
        return true; // Show all if no current URL
      }

      return secret.prefixes.some((prefix) => {
        try {
          const prefixUrl = new URL(prefix);
          return prefixUrl.origin === currentTabUrl.origin;
        } catch {
          return false;
        }
      });
    });

    // Show only enabled TOTPs
    const enabledSecrets = filteredSecrets.filter(
      (secret) => secret.enabled !== false
    );

    for (let i = 0; i < enabledSecrets.length; i++) {
      const item = enabledSecrets[i];
      const code = await generateTOTP(item.secret);
      const remainingTime = 30 - (Math.floor(Date.now() / 1000) % 30);

      const entry = document.createElement("div");
      entry.className = "entry";

      const titleElement = document.createElement("div");
      titleElement.className = "title";
      titleElement.textContent = item.title;

      const usernameElement = document.createElement("div");
      usernameElement.className = "username";
      usernameElement.textContent = item.username || "";

      const codeSpan = document.createElement("span");
      codeSpan.className = "code";
      codeSpan.textContent = code;

      // Add red class for last 5 seconds
      if (remainingTime <= 5) {
        codeSpan.classList.add("red");
      } else {
        codeSpan.classList.remove("red");
      }

      entry.appendChild(titleElement);
      entry.appendChild(usernameElement);
      entry.appendChild(codeSpan);
      codeList.appendChild(entry);

      // Add click-to-copy functionality
      entry.onclick = () => {
        navigator.clipboard
          .writeText(code)
          .then(() => {
            entry.classList.add("copied");
            showNotification("Copied to clipboard!");
            setTimeout(() => {
              entry.classList.remove("copied");
            }, 1000);
          })
          .catch((err) => {
            console.error("Failed to copy:", err);
            showNotification("Failed to copy");
          });
      };
    }

    setTimeout(renderCodes, 500);
  });
}

// Update timers every second
renderCodes();
