let data = [];
let hasUnsavedChanges = false;
const GIST_ID = "552beb4c3904173631f320a2ca87296e";
let GITHUB_TOKEN = localStorage.getItem("github_token") || "";
let lastGistContent = "";

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  // Check if we should load from Gist or local storage
  const loadFromGist = localStorage.getItem("loadFromGist") === "true";
  document.getElementById("load-from-gist").checked = loadFromGist;

  // Set token if available
  if (GITHUB_TOKEN) {
    document.getElementById("github-token").value = GITHUB_TOKEN; // ← ប្ដូរទីនេះ
  }

  if (loadFromGist) {
    loadFromGistSource();
  } else {
    loadFromLocalStorage();
  }

  // Add event listener for the toggle
  document
    .getElementById("load-from-gist")
    .addEventListener("change", function () {
      localStorage.setItem("loadFromGist", this.checked);
      showNotification(
        "Setting saved. Changes will take effect on next refresh.",
        "warning"
      );
    });
});

function saveToken() {
  const tokenInput = document.getElementById("github-token");

  if (tokenInput.value) {
    GITHUB_TOKEN = tokenInput.value;
    localStorage.setItem("github_token", GITHUB_TOKEN);

    // ❌ REMOVE or COMMENT this line:
    // tokenInput.value = "••••••••••••••••";

    showNotification("GitHub token saved successfully!", "success");
  } else {
    showNotification("Please enter a valid GitHub token", "error");
  }
}

function toggleToken() {
  const input = document.getElementById("github-token");
  input.type = input.type === "password" ? "text" : "password";
}

function toggleToken() {
  const input = document.getElementById("github-token");
  const btn = document.getElementById("toggle-token-btn");

  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "Hide";
  } else {
    input.type = "password";
    btn.textContent = "Unhide";
  }
}

// Fetch data from Gist
async function loadFromGistSource() {
  try {
    showNotification("Loading data from Gist...", "info");

    const response = await fetch(
      "https://gist.githubusercontent.com/Unknow-Hahaha/552beb4c3904173631f320a2ca87296e/raw"
    );
    const text = await response.text();
    lastGistContent = text;
    parseGistData(text);

    // ✅ Final success message
    showNotification("✅ Successfully loaded data from Gist!", "success");
  } catch (error) {
    console.error("Failed to load Gist:", error);
    showNotification(
      "❌ Failed to load from Gist. Loading local data instead.",
      "error"
    );
    loadFromLocalStorage();
  }
}


function parseGistData(text) {
  const lines = text.split("\n");
  const newData = [];
  let entry = {};

  lines.forEach((line) => {
    if (line.startsWith("DEVICE_HASH=")) {
      entry.DEVICE_HASH = line.split("=")[1];
    } else if (line.startsWith("USER=")) {
      entry.USER = line.split("=")[1];
    } else if (line.startsWith("EXPIRY=")) {
      entry.EXPIRY = line.split("=")[1];
    } else if (line.trim() === "" && entry.DEVICE_HASH) {
      newData.push(entry);
      entry = {};
    }
  });

  if (entry.DEVICE_HASH) {
    newData.push(entry);
  }

  data = newData;
  hasUnsavedChanges = false;
  updateStatus();
  renderEntries();
  updateLastUpdateTime();
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem("deviceHashData");
  if (stored) {
    data = JSON.parse(stored);
    hasUnsavedChanges = false;
    updateStatus();
    renderEntries();
    updateLastUpdateTime();
    showNotification("Data loaded from local storage.", "success");
  } else {
    showNotification(
      "No local data found. Add new entries or load from Gist.",
      "warning"
    );
  }
}

function renderEntries() {
  const container = document.getElementById("entries-container");
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <h3>No entries found</h3>
                <p>Click "Add New Entry" to get started</p>
            </div>
        `;
    return;
  }

  data.forEach((entry, index) => {
    const entryDiv = document.createElement("div");
    entryDiv.className = "entry";
    const expiryDate = entry.EXPIRY ? new Date(entry.EXPIRY) : null;
    const now = new Date();
    let daysLeftText = "";
    let expiredClass = "";

    if (expiryDate) {
      const diff = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      if (diff >= 0) {
        daysLeftText = `${diff} day${diff !== 1 ? "s" : ""} left`;
      } else {
        daysLeftText = "Expired";
        expiredClass = " expired";
      }
    }

    entryDiv.innerHTML = `
        <input value="${entry.DEVICE_HASH || ""}" placeholder="Device Hash" 
                onchange="updateField(${index}, 'DEVICE_HASH', this.value)">
        <input value="${entry.USER || ""}" placeholder="Username" 
                onchange="updateField(${index}, 'USER', this.value)">
        <div class="days-left${expiredClass}">${daysLeftText}</div>
        <input type="datetime-local" value="${
          entry.EXPIRY ? entry.EXPIRY.replace(" ", "T") : ""
        }" 
                onchange="updateField(${index}, 'EXPIRY', this.value.replace('T', ' '))">

        <div class="expiry-dropdown">
            <button class="btn btn-secondary" onclick="toggleExpiryPopup(${index}, this)">Set Expiry ⌵</button>
            <div class="expiry-popup" id="expiry-popup-${index}" style="display: none;"></div>
        </div>

        <button class="delete-btn" onclick="deleteEntry(${index})">Delete</button>
        `;

    container.appendChild(entryDiv);
  });

  const counter = document.getElementById("entry-counter");
  if (counter) {
    counter.textContent = `${data.length} User${data.length === 1 ? "s" : "s"}`;
  }
}

function updateField(index, field, value) {
  data[index][field] = value;
  hasUnsavedChanges = true;
  updateStatus();
}

function addNewEntry() {
  const newUserEntry = {
    DEVICE_HASH: "",
    USER: "",
    EXPIRY: new Date().toISOString().slice(0, 16).replace("T", " "),
  };
  data.unshift(newUserEntry); // Add new entry at the top
  hasUnsavedChanges = true;
  updateStatus();
  renderEntries(); // Re-render entries to reflect the change
}

function deleteEntry(index) {
  if (confirm("Are you sure you want to delete this entry?")) {
    data.splice(index, 1);
    hasUnsavedChanges = true;
    updateStatus();
    renderEntries();
    showNotification("Entry deleted. Updating Gist...", "warning");
    updateGist(); // <--- push changes right after deletion
  }
}

async function updateGist() {
  if (!GITHUB_TOKEN) {
    showNotification("❌ GitHub token is missing!", "error");
    return;
  }

  if (data.length === 0) {
    showNotification("⚠️ No data to update!", "warning");
    return;
  }

  // Generate the new content
  let text = data
    .map(
      (entry) =>
        `DEVICE_HASH=${entry.DEVICE_HASH}\nUSER=${entry.USER}\nEXPIRY=${entry.EXPIRY}`
    )
    .join("\n\n");

  try {
    const updateResponse = await fetch(
      `https://api.github.com/gists/${GIST_ID}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          files: {
            "license_pig.txt": { content: text },
          },
        }),
      }
    );

    if (updateResponse.ok) {
      showNotification("✅ Gist updated successfully!", "success");

      await new Promise((resolve) => setTimeout(resolve, 1500)); // let user see success
    
      hasUnsavedChanges = false;
      updateStatus();
      updateLastUpdateTime();

    //   showNotification("📥 Loading data from Gist...", "info");
      await loadFromGistSource();
    } else {
      const errData = await updateResponse.json();
      showNotification(`❌ Failed to update Gist: ${errData.message}`, "error");
      console.error(errData);
    }
  } catch (error) {
    console.error("Error updating Gist:", error);
    showNotification("❌ An error occurred while updating the Gist.", "error");
  }
}


function updateStatus() {
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  if (hasUnsavedChanges) {
    statusDot.className = "status-dot status-unsaved";
    statusText.textContent = "Unsaved changes";
  } else {
    statusDot.className = "status-dot status-saved";
    statusText.textContent = "All changes saved";
  }
}

function updateLastUpdateTime() {
  const now = new Date();
  const formattedTime = now.toLocaleTimeString();
  document.getElementById("last-update").textContent =
    "Last update: " + formattedTime;
}

function showNotification(message, type) {
  const notification = document.getElementById("notification");
  const messageElement = document.getElementById("notification-message");

  messageElement.textContent = message;
  notification.className = `notification ${type} show`;

  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

function searchEntry() {
  const searchValue = document.getElementById("search-input").value.trim();
  const container = document.getElementById("entries-container");

  if (!searchValue) {
    showNotification("Please enter a Device Hash to search", "warning");
    return;
  }

  const filtered = data
    .map((entry, i) => ({ entry, originalIndex: i }))
    .filter(({ entry }) => entry.DEVICE_HASH === searchValue);

  if (filtered.length > 0) {
    container.innerHTML = "";
    filtered.forEach(({ entry, originalIndex }) => {
      const entryDiv = document.createElement("div");
      entryDiv.className = "entry";
      const expiryDate = entry.EXPIRY ? new Date(entry.EXPIRY) : null;
      const now = new Date();
      let daysLeftText = "";
      let expiredClass = "";

      if (expiryDate) {
        const diff = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        if (diff >= 0) {
          daysLeftText = `${diff} day${diff !== 1 ? "s" : ""} left`;
        } else {
          daysLeftText = "Expired";
          expiredClass = " expired";
        }
      }

      entryDiv.innerHTML = `
                <input value="${
                  entry.DEVICE_HASH || ""
                }" placeholder="Device Hash">
                <input value="${entry.USER || ""}" placeholder="Username">
                <div class="days-left${expiredClass}">${daysLeftText}</div>
                <input type="datetime-local" value="${
                  entry.EXPIRY ? entry.EXPIRY.replace(" ", "T") : ""
                }">
                <button class="delete-btn" onclick="deleteEntry(${originalIndex})">Delete</button>
            `;
      container.appendChild(entryDiv);
    });

    showNotification(`Found ${filtered.length} matching entry(ies)`, "success");
  } else {
    showNotification("No matching Device Hash found", "error");
  }
}

function clearSearch() {
  document.getElementById("search-input").value = "";
  renderEntries(); // show all again
}

function toggleExpiryPopup(index, btn) {
  let popup = document.getElementById("global-expiry-popup");

  // If doesn't exist yet, create once
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "global-expiry-popup";
    popup.className = "expiry-popup";
    document.body.appendChild(popup);
  }

  // Close if already open
  const isOpen = popup.getAttribute("data-popup-open") === "true";
  if (isOpen && popup.getAttribute("data-entry") === String(index)) {
    popup.style.display = "none";
    popup.setAttribute("data-popup-open", "false");
    return;
  }

  // Clear and add new buttons
  popup.innerHTML = "";
  for (let day = 1; day <= 30; day++) {
    const btnDay = document.createElement("button");
    btnDay.textContent = `${day} Day`;
    btnDay.onclick = () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + day);
      const formatted = expiryDate.toISOString().slice(0, 16).replace("T", " ");
      updateField(index, "EXPIRY", formatted);
      renderEntries();
      popup.style.display = "none";
      popup.setAttribute("data-popup-open", "false");
    };
    popup.appendChild(btnDay);
  }

  // Position popup below the button
  const rect = btn.getBoundingClientRect();
  popup.style.position = "absolute";
  popup.style.left = rect.left + window.scrollX + "px";
  popup.style.top = rect.bottom + window.scrollY + "px";
  popup.style.zIndex = "9999";
  popup.style.display = "flex";
  popup.setAttribute("data-popup-open", "true");
  popup.setAttribute("data-entry", index);
}
