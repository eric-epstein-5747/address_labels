// Application state
let contacts = [];
let currentFilePath = null;
let selectedContacts = new Set();

// DOM elements
const openFileBtn = document.getElementById('openFileBtn');
const saveBtn = document.getElementById('saveBtn');
const saveAsBtn = document.getElementById('saveAsBtn');
const addContactBtn = document.getElementById('addContactBtn');
const deleteContactBtn = document.getElementById('deleteContactBtn');
const searchInput = document.getElementById('searchInput');
const contactsList = document.getElementById('contactsList');
const contactCount = document.getElementById('contactCount');
const addContactModal = document.getElementById('addContactModal');

// Modal elements
const closeModalBtn = document.querySelector('.close-btn');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const confirmAddBtn = document.getElementById('confirmAddBtn');
const contactName = document.getElementById('contactName');
const contactAddress = document.getElementById('contactAddress');
const contactCity = document.getElementById('contactCity');
const contactState = document.getElementById('contactState');
const contactZip = document.getElementById('contactZip');

// Event listeners
openFileBtn.addEventListener('click', openFile);
saveBtn.addEventListener('click', saveFile);
saveAsBtn.addEventListener('click', saveAsFile);
addContactBtn.addEventListener('click', openAddContactModal);
deleteContactBtn.addEventListener('click', deleteSelectedContacts);
searchInput.addEventListener('input', filterContacts);
closeModalBtn.addEventListener('click', closeAddContactModal);
cancelAddBtn.addEventListener('click', closeAddContactModal);
confirmAddBtn.addEventListener('click', addNewContact);

// Close modal when clicking outside
addContactModal.addEventListener('click', (e) => {
  if (e.target === addContactModal) {
    closeAddContactModal();
  }
});

// Intelligent last name extraction
function extractLastName(nameString) {
  // Remove common prefixes
  let name = nameString.trim();

  // Handle "The [Name]" format - extract the name after "The"
  if (name.toLowerCase().startsWith('the ')) {
    name = name.substring(4).trim();
  }

  // Handle "Mr.", "Mrs.", "Ms.", "Dr.", etc.
  name = name.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Rev\.)\s+/i, '');

  // Handle family formats like "The Smiths" or "Smith Family"
  if (name.toLowerCase().endsWith(' family')) {
    return name.substring(0, name.length - 7).trim();
  }

  // Handle plural family names (e.g., "The Johnsons")
  // Just use the name as-is if it's already been processed

  // Handle "Name & Name" or "Name and Name" format
  if (name.includes(' & ') || name.includes(' and ')) {
    // Split by & or and, take the first name
    const parts = name.split(/ & | and /i);
    name = parts[0].trim();
  }

  // Extract last word as last name (handles "John Smith", "John & Jane Smith", etc.)
  const words = name.split(/\s+/);

  // If there's only one word, return it
  if (words.length === 1) {
    return words[0];
  }

  // Return the last word as the last name
  return words[words.length - 1];
}

// Parse contact from text block
function parseContact(textBlock) {
  const lines = textBlock.split('\n').map(l => l.trim()).filter(l => l);

  if (lines.length === 0) return null;

  const name = lines[0];
  const addressLines = lines.slice(1);

  // Extract last name for sorting
  const sortKey = extractLastName(name);

  return {
    name: name,
    addressLines: addressLines,
    fullAddress: lines.join('\n'),
    sortKey: sortKey.toUpperCase() // Uppercase for consistent sorting
  };
}

// Parse contacts from array of text blocks (from table cells)
function parseContactsFromArray(contactsArray) {
  const parsedContacts = [];

  for (const textBlock of contactsArray) {
    const trimmed = textBlock.trim();
    if (trimmed) {
      const contact = parseContact(trimmed);
      if (contact) {
        parsedContacts.push(contact);
      }
    }
  }

  return parsedContacts;
}

// Sort contacts alphabetically by last name
function sortContacts(contactsArray) {
  return contactsArray.sort((a, b) => {
    return a.sortKey.localeCompare(b.sortKey);
  });
}

// Open file dialog and load contacts
async function openFile() {
  const filePath = await window.electronAPI.selectFile();

  if (!filePath) return;

  const result = await window.electronAPI.readWordFile(filePath);

  if (result.success) {
    currentFilePath = result.filePath;
    // result.contacts is now an array of text blocks from table cells
    contacts = parseContactsFromArray(result.contacts);
    contacts = sortContacts(contacts);

    renderContacts();
    updateUI();
  } else {
    alert('Error reading file: ' + result.error);
  }
}

// Save file
async function saveFile() {
  if (!currentFilePath) {
    saveAsFile();
    return;
  }

  const sortedContacts = sortContacts([...contacts]);
  const result = await window.electronAPI.saveWordFile(sortedContacts, currentFilePath);

  if (result.success) {
    alert('File saved successfully!');
  } else {
    alert('Error saving file: ' + result.error);
  }
}

// Save as new file
async function saveAsFile() {
  const sortedContacts = sortContacts([...contacts]);
  const result = await window.electronAPI.saveAsWordFile(sortedContacts);

  if (result.success) {
    currentFilePath = result.filePath;
    alert('File saved successfully!');
  } else if (result.error !== 'Save cancelled') {
    alert('Error saving file: ' + result.error);
  }
}

// Render contacts list
function renderContacts(filter = '') {
  contactsList.innerHTML = '';

  if (contacts.length === 0) {
    contactsList.innerHTML = '<div class="empty-state"><p>No contacts loaded. Open an address file to get started.</p></div>';
    return;
  }

  const filterLower = filter.toLowerCase();
  const filteredContacts = contacts.filter(contact => {
    if (!filter) return true;
    return contact.fullAddress.toLowerCase().includes(filterLower);
  });

  if (filteredContacts.length === 0) {
    contactsList.innerHTML = '<div class="empty-state"><p>No contacts match your search.</p></div>';
    return;
  }

  filteredContacts.forEach((contact, index) => {
    const contactDiv = document.createElement('div');
    contactDiv.className = 'contact-item';
    contactDiv.dataset.index = contacts.indexOf(contact);

    if (selectedContacts.has(contact)) {
      contactDiv.classList.add('selected');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'contact-checkbox';
    checkbox.checked = selectedContacts.has(contact);
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleContactSelection(contact);
    });

    const contactInfo = document.createElement('div');
    contactInfo.className = 'contact-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'contact-name';
    nameDiv.textContent = contact.name;

    const sortKeySpan = document.createElement('span');
    sortKeySpan.className = 'contact-sort-key';
    sortKeySpan.textContent = `(sorts as: ${contact.sortKey})`;
    nameDiv.appendChild(sortKeySpan);

    const addressDiv = document.createElement('div');
    addressDiv.className = 'contact-address';
    addressDiv.textContent = contact.addressLines.join(', ');

    contactInfo.appendChild(nameDiv);
    contactInfo.appendChild(addressDiv);

    contactDiv.appendChild(checkbox);
    contactDiv.appendChild(contactInfo);

    contactDiv.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        toggleContactSelection(contact);
      }
    });

    contactsList.appendChild(contactDiv);
  });

  updateContactCount();
}

// Toggle contact selection
function toggleContactSelection(contact) {
  if (selectedContacts.has(contact)) {
    selectedContacts.delete(contact);
  } else {
    selectedContacts.add(contact);
  }

  renderContacts(searchInput.value);
  updateDeleteButton();
}

// Filter contacts
function filterContacts() {
  renderContacts(searchInput.value);
}

// Open add contact modal
function openAddContactModal() {
  addContactModal.classList.add('active');
  contactName.value = '';
  contactAddress.value = '';
  contactCity.value = '';
  contactState.value = '';
  contactZip.value = '';
  contactName.focus();
}

// Close add contact modal
function closeAddContactModal() {
  addContactModal.classList.remove('active');
}

// Add new contact
function addNewContact() {
  const name = contactName.value.trim();
  const address = contactAddress.value.trim();
  const city = contactCity.value.trim();
  const state = contactState.value.trim();
  const zip = contactZip.value.trim();

  if (!name) {
    alert('Please enter a name');
    return;
  }

  const addressLines = [];
  if (address) addressLines.push(address);
  if (city || state || zip) {
    const cityStateZip = [city, state, zip].filter(x => x).join(' ');
    addressLines.push(cityStateZip);
  }

  const fullAddress = [name, ...addressLines].join('\n');
  const sortKey = extractLastName(name);

  const newContact = {
    name: name,
    addressLines: addressLines,
    fullAddress: fullAddress,
    sortKey: sortKey.toUpperCase()
  };

  contacts.push(newContact);
  contacts = sortContacts(contacts);

  renderContacts();
  updateUI();
  closeAddContactModal();
}

// Delete selected contacts
function deleteSelectedContacts() {
  if (selectedContacts.size === 0) return;

  const count = selectedContacts.size;
  const confirmMsg = count === 1
    ? 'Are you sure you want to delete this contact?'
    : `Are you sure you want to delete ${count} contacts?`;

  if (!confirm(confirmMsg)) return;

  contacts = contacts.filter(contact => !selectedContacts.has(contact));
  selectedContacts.clear();

  renderContacts();
  updateUI();
}

// Update contact count
function updateContactCount() {
  const count = contacts.length;
  contactCount.textContent = count === 1 ? '1 contact' : `${count} contacts`;
}

// Update delete button state
function updateDeleteButton() {
  deleteContactBtn.disabled = selectedContacts.size === 0;
}

// Update UI state
function updateUI() {
  const hasContacts = contacts.length > 0;
  addContactBtn.disabled = false;
  saveBtn.disabled = !hasContacts;
  saveAsBtn.disabled = !hasContacts;
  updateDeleteButton();
  updateContactCount();
}

// Initialize
updateUI();
