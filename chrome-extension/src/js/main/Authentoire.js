const codeList = document.getElementById("code-list");
const addBtn = document.getElementById("add-btn");
const addDialog = document.getElementById("addDialog"); // Changed from add-form to addDialog
const newAccountForm = document.getElementById("newAccountForm"); // Get the form element
const cancelAddBtn = document.getElementById("cancelAddBtn"); // Get the cancel button

const labelInput = document.getElementById("label");
const secretInput = document.getElementById("secret");

document.addEventListener('DOMContentLoaded', () => {
  // Initialize elements
  const codeList = document.getElementById("code-list");
  const addBtn = document.getElementById("add-btn");
  const addDialog = document.getElementById("addDialog");
  const newAccountForm = document.getElementById("newAccountForm");
  const cancelAddBtn = document.getElementById("cancelAddBtn");
  const labelInput = document.getElementById("label");
  const secretInput = document.getElementById("secret");

  // Handle form submission
  newAccountForm.onsubmit = (event) => {
    event.preventDefault();
    const label = labelInput.value.trim();
    const secret = secretInput.value.trim();
    if (!label || !secret) return;

    chrome.storage.local.get("secrets", (data) => {
      const secrets = data.secrets || [];
      secrets.push({ label, secret });
      chrome.storage.local.set({ secrets }, () => {
        labelInput.value = "";
        secretInput.value = "";
        addDialog.close();
      });
    });
  };

  // Handle cancel button
  cancelAddBtn.onclick = () => addDialog.close();

  // Handle add button
  addBtn.onclick = () => addDialog.showModal();
});

const notification = document.getElementById('notification');

function showNotification(message) {
  notification.textContent = message;
  notification.classList.remove('hide');
  setTimeout(() => notification.classList.add('hide'), 2000);
}

async function renderCodes() {
  chrome.storage.local.get("secrets", async (data) => {
    const secrets = data.secrets || [];
    codeList.innerHTML = "";

    // Update progress bar
    const remainingTime = 30 - Math.floor(Date.now() / 1000) % 30;
    const progress = document.getElementById('timer-progress');
    progress.style.width = `${(remainingTime / 30) * 100}%`;

    for (let i = 0; i < secrets.length; i++) {
      const item = secrets[i];
      const code = await generateTOTP(item.secret);
      const remainingTime = 30 - Math.floor(Date.now() / 1000) % 30;

      const entry = document.createElement("div");
      entry.className = "entry";
      entry.onclick = (e) => {
        if (!e.target.closest('.delete-btn') && !e.target.closest('.edit-btn')) {
          navigator.clipboard.writeText(code);
          entry.classList.add('copied');
          showNotification('Copied to clipboard!');
          setTimeout(() => entry.classList.remove('copied'), 1000);
        }
      };

      const title = document.createElement("span");
      title.className = "title";
      title.textContent = item.label;

      const codeSpan = document.createElement("span");
      codeSpan.className = "code";
      codeSpan.textContent = code;
      
      // Add red class for last 5 seconds
      if (remainingTime <= 5) {
        codeSpan.classList.add('red');
      } else {
        codeSpan.classList.remove('red');
      }

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" width="24" height="24">\n        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z"/>\n      </svg>';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        editSecret(i, item.label);
      };

      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" width="24" height="24">\n        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>\n      </svg>';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        deleteSecret(i);
      };

      // Create a container for edit and delete buttons
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'button-container';
      buttonContainer.appendChild(editBtn);
      buttonContainer.appendChild(delBtn);

      entry.appendChild(title);
      entry.appendChild(codeSpan);
      entry.appendChild(buttonContainer);
      codeList.appendChild(entry);
    }
  });

  setTimeout(renderCodes, 500);
}

function editSecret(index, currentLabel) {
  const newLabel = prompt('Enter new label:', currentLabel);
  if (newLabel && newLabel !== currentLabel) {
    chrome.storage.local.get("secrets", (data) => {
      const secrets = data.secrets || [];
      secrets[index].label = newLabel;
      chrome.storage.local.set({ secrets });
    });
  }
}

function deleteSecret(index) {
  chrome.storage.local.get("secrets", (data) => {
    const secrets = data.secrets || [];
    secrets.splice(index, 1);
    chrome.storage.local.set({ secrets });
  });
}

cancelAddBtn.onclick = () => {
  addDialog.close(); // Close the dialog on cancel
};

// Update timers every second
renderCodes();
