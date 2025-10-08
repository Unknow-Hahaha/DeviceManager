let data = [];
let hasUnsavedChanges = false;
const GIST_ID = '552beb4c3904173631f320a2ca87296e';
let GITHUB_TOKEN = localStorage.getItem('github_token') || '';
let autoUpdateInterval = null;
let lastGistContent = '';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if we should load from Gist or local storage
    const loadFromGist = localStorage.getItem('loadFromGist') === 'true';
    document.getElementById('load-from-gist').checked = loadFromGist;
    
    // Set token if available
    if (GITHUB_TOKEN) {
        document.getElementById('github-token').value = '••••••••••••••••';
    }
    
    // Set up auto-update settings
    const autoUpdateEnabled = localStorage.getItem('autoUpdateEnabled') === 'true';
    document.getElementById('auto-update-toggle').checked = autoUpdateEnabled;
    
    const updateInterval = localStorage.getItem('updateInterval') || '5';
    document.getElementById('update-interval').value = updateInterval;
    
    if (loadFromGist) {
        loadFromGistSource();
    } else {
        loadFromLocalStorage();
    }
    
    // Add event listener for the toggle
    document.getElementById('load-from-gist').addEventListener('change', function() {
        localStorage.setItem('loadFromGist', this.checked);
        showNotification('Setting saved. Changes will take effect on next refresh.', 'warning');
    });
    
    // Initialize auto-update if enabled
    if (autoUpdateEnabled) {
        startAutoUpdate(parseInt(updateInterval));
    }
    
    // Set up focus/visibility event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
});

function saveToken() {
    const tokenInput = document.getElementById('github-token');
    if (tokenInput.value && tokenInput.value !== '••••••••••••••••') {
        GITHUB_TOKEN = tokenInput.value;
        localStorage.setItem('github_token', GITHUB_TOKEN);
        tokenInput.value = '••••••••••••••••';
        showNotification('GitHub token saved successfully!', 'success');
    } else {
        showNotification('Please enter a valid GitHub token', 'error');
    }
}

// Auto-update functions
function toggleAutoUpdate(enabled) {
    localStorage.setItem('autoUpdateEnabled', enabled);
    
    if (enabled) {
        const interval = parseInt(document.getElementById('update-interval').value);
        startAutoUpdate(interval);
        showNotification('Auto-update enabled. Checking every ' + interval + ' minutes.', 'success');
    } else {
        stopAutoUpdate();
        showNotification('Auto-update disabled.', 'info');
    }
}

function changeUpdateInterval(interval) {
    localStorage.setItem('updateInterval', interval);
    
    if (document.getElementById('auto-update-toggle').checked) {
        stopAutoUpdate();
        startAutoUpdate(parseInt(interval));
        showNotification('Update interval changed to ' + interval + ' minutes.', 'info');
    }
}

function startAutoUpdate(intervalMinutes) {
    // Clear any existing interval
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
    }
    
    // Set up new interval
    autoUpdateInterval = setInterval(async () => {
        await checkForUpdates(false); // false = don't show notification if no update
    }, intervalMinutes * 60 * 1000);
    
    // Also check immediately
    checkForUpdates(false);
}

function stopAutoUpdate() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
    }
}

function handleVisibilityChange() {
    if (!document.hidden && document.getElementById('auto-update-toggle').checked) {
        // Page became visible, check for updates
        checkForUpdates(false);
    }
}

function handleWindowFocus() {
    if (document.getElementById('auto-update-toggle').checked) {
        // Window gained focus, check for updates
        checkForUpdates(false);
    }
}

async function checkForUpdates(showNoUpdateNotification = true) {
    try {
        const response = await fetch('https://gist.githubusercontent.com/Unknow-Hahaha/552beb4c3904173631f320a2ca87296e/raw?' + new Date().getTime());
        const text = await response.text();
        
        if (text !== lastGistContent && text.trim() !== '') {
            // New content detected
            lastGistContent = text;
            parseGistData(text);
            showNotification('New data loaded from Gist!', 'success');
        } else if (showNoUpdateNotification) {
            showNotification('No updates available.', 'info');
        }
    } catch (error) {
        console.error('Failed to check for updates:', error);
        if (showNoUpdateNotification) {
            showNotification('Failed to check for updates.', 'error');
        }
    }
}

// Fetch data from Gist
async function loadFromGistSource() {
    try {
        showNotification('Loading data from Gist...', 'warning');
        const response = await fetch('https://gist.githubusercontent.com/Unknow-Hahaha/552beb4c3904173631f320a2ca87296e/raw');
        const text = await response.text();
        lastGistContent = text;
        parseGistData(text);
    } catch (error) {
        console.error('Failed to load Gist:', error);
        showNotification('Failed to load from Gist. Loading local data.', 'error');
        loadFromLocalStorage();
    }
}

function parseGistData(text) {
    const lines = text.split('\n');
    const newData = [];
    let entry = {};
    
    lines.forEach(line => {
        if (line.startsWith('DEVICE_HASH=')) {
            entry.DEVICE_HASH = line.split('=')[1];
        } else if (line.startsWith('USER=')) {
            entry.USER = line.split('=')[1];
        } else if (line.startsWith('EXPIRY=')) {
            entry.EXPIRY = line.split('=')[1];
        } else if (line.trim() === '' && entry.DEVICE_HASH) {
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
    const stored = localStorage.getItem('deviceHashData');
    if (stored) {
        data = JSON.parse(stored);
        hasUnsavedChanges = false;
        updateStatus();
        renderEntries();
        updateLastUpdateTime();
        showNotification('Data loaded from local storage.', 'success');
    } else {
        showNotification('No local data found. Add new entries or load from Gist.', 'warning');
    }
}

function renderEntries() {
    const container = document.getElementById('entries-container');
    container.innerHTML = '';
    
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
        const entryDiv = document.createElement('div');
        entryDiv.className = 'entry';
        const expiryDate = entry.EXPIRY ? new Date(entry.EXPIRY) : null;
        const now = new Date();
        let daysLeftText = '';
        let expiredClass = '';

        if (expiryDate) {
            const diff = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            if (diff >= 0) {
                daysLeftText = `${diff} day${diff !== 1 ? 's' : ''} left`;
            } else {
                daysLeftText = 'Expired';
                expiredClass = ' expired';
            }
        }


        entryDiv.innerHTML = `
            <input value="${entry.DEVICE_HASH || ''}" placeholder="Device Hash" 
                    onchange="updateField(${index}, 'DEVICE_HASH', this.value)">
            <input value="${entry.USER || ''}" placeholder="Username" 
                    onchange="updateField(${index}, 'USER', this.value)">
            <div class="days-left${expiredClass}">${daysLeftText}</div>
            <input type="datetime-local" value="${entry.EXPIRY ? entry.EXPIRY.replace(' ', 'T') : ''}" 
                    onchange="updateField(${index}, 'EXPIRY', this.value.replace('T', ' '))">
            <button class="delete-btn" onclick="deleteEntry(${index})">Delete</button>
        `;

        container.appendChild(entryDiv);
    });
    
    const counter = document.getElementById('entry-counter');
    if (counter) {
        counter.textContent = `${data.length} User${data.length === 1 ? 's' : 's'}`;
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
        EXPIRY: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    data.unshift(newUserEntry);  // Add new entry at the top
    hasUnsavedChanges = true;
    updateStatus();
    renderEntries();  // Re-render entries to reflect the change
}


function deleteEntry(index) {
    if (confirm("Are you sure you want to delete this entry?")) {
        data.splice(index, 1);
        hasUnsavedChanges = true;
        updateStatus();
        renderEntries();
        showNotification('Entry deleted. Updating Gist...', 'warning');
        updateGist(); // <--- push changes right after deletion
    }
}


function exportData() {
    let text = '';
    data.forEach(entry => {
        text += `DEVICE_HASH=${entry.DEVICE_HASH}\nUSER=${entry.USER}\nEXPIRY=${entry.EXPIRY}\n\n`;
    });
    
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'license_pig.txt';
    a.click();
    
    showNotification('Data exported successfully!', 'success');
}

async function updateGist() {
    if (!GITHUB_TOKEN) {
        showNotification('Please enter your GitHub token first', 'error');
        document.getElementById('github-token').focus();
        return;
    }
    
    // Move the first entry ("NewUser") to the bottom if it exists
    if (data.length > 1 && data[0].USER === "NewUser") {
        const newUserEntry = data.shift(); // Remove the first entry
        data.push(newUserEntry);  // Add it to the end of the array
    }

    let text = '';
    data.forEach(entry => {
        text += `DEVICE_HASH=${entry.DEVICE_HASH}\nUSER=${entry.USER}\nEXPIRY=${entry.EXPIRY}\n\n`;
    });
    
    lastGistContent = text;
    
    try {
        showNotification('Updating Gist...', 'warning');
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                files: {
                    'license_pig.txt': {
                        content: text
                    }
                }
            })
        });
        
        if (response.ok) {
            hasUnsavedChanges = false;
            updateStatus();
            updateLastUpdateTime();
            renderEntries();
            showNotification('Gist updated successfully!', 'success');
        } else {
            const error = await response.json();
            showNotification(`Failed to update Gist: ${error.message}`, 'error');
            console.error('GitHub API Error:', error);
            
            if (response.status === 401) {
                GITHUB_TOKEN = '';
                localStorage.removeItem('github_token');
                document.getElementById('github-token').value = '';
            }
        }
    } catch (error) {
        showNotification('Network error: ' + error.message, 'error');
        console.error('Update error:', error);
    }
}


function updateStatus() {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    if (hasUnsavedChanges) {
        statusDot.className = 'status-dot status-unsaved';
        statusText.textContent = 'Unsaved changes';
    } else {
        statusDot.className = 'status-dot status-saved';
        statusText.textContent = 'All changes saved';
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString();
    document.getElementById('last-update').textContent = 'Last update: ' + formattedTime;
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notification-message');
    
    messageElement.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function searchEntry() {
    const searchValue = document.getElementById('search-input').value.trim();
    const container = document.getElementById('entries-container');

    if (!searchValue) {
        showNotification('Please enter a Device Hash to search', 'warning');
        return;
    }

    const filtered = data
        .map((entry, i) => ({ entry, originalIndex: i }))
        .filter(({ entry }) => entry.DEVICE_HASH === searchValue);

    if (filtered.length > 0) {
        container.innerHTML = '';
        filtered.forEach(({ entry, originalIndex }) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry';
            const expiryDate = entry.EXPIRY ? new Date(entry.EXPIRY) : null;
            const now = new Date();
            let daysLeftText = '';
            let expiredClass = '';

            if (expiryDate) {
                const diff = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                if (diff >= 0) {
                    daysLeftText = `${diff} day${diff !== 1 ? 's' : ''} left`;
                } else {
                    daysLeftText = 'Expired';
                    expiredClass = ' expired';
                }
            }

            entryDiv.innerHTML = `
                <input value="${entry.DEVICE_HASH || ''}" placeholder="Device Hash">
                <input value="${entry.USER || ''}" placeholder="Username">
                <div class="days-left${expiredClass}">${daysLeftText}</div>
                <input type="datetime-local" value="${entry.EXPIRY ? entry.EXPIRY.replace(' ', 'T') : ''}">
                <button class="delete-btn" onclick="deleteEntry(${originalIndex})">Delete</button>
            `;
            container.appendChild(entryDiv);
        });

        showNotification(`Found ${filtered.length} matching entry(ies)`, 'success');
    } else {
        showNotification('No matching Device Hash found', 'error');
    }
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    renderEntries(); // show all again
}

