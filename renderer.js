// Application state
let contacts = [];
let currentFilePath = null;
let selectedContacts = new Set();
let isDefaultContacts = false; // Track if we're viewing default contacts

// DOM elements
const openFileBtn = document.getElementById('openFileBtn');
const loadDefaultBtn = document.getElementById('loadDefaultBtn');
const saveDefaultBtn = document.getElementById('saveDefaultBtn');
const saveBtn = document.getElementById('saveBtn');
const saveAsBtn = document.getElementById('saveAsBtn');
const addContactBtn = document.getElementById('addContactBtn');
const deleteContactBtn = document.getElementById('deleteContactBtn');
const searchInput = document.getElementById('searchInput');
const contactsList = document.getElementById('contactsList');
const contactCount = document.getElementById('contactCount');
const addContactModal = document.getElementById('addContactModal');
const editSortKeyModal = document.getElementById('editSortKeyModal');
const editContactModal = document.getElementById('editContactModal');

// Add Contact Modal elements
const closeModalBtn = document.querySelector('.close-btn');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const confirmAddBtn = document.getElementById('confirmAddBtn');
const contactName = document.getElementById('contactName');
const contactAddress = document.getElementById('contactAddress');
const contactCity = document.getElementById('contactCity');
const contactState = document.getElementById('contactState');
const contactZip = document.getElementById('contactZip');

// Edit Sort Key Modal elements
const closeSortModalBtn = document.querySelector('.close-btn-sort');
const cancelEditSortBtn = document.getElementById('cancelEditSortBtn');
const confirmEditSortBtn = document.getElementById('confirmEditSortBtn');
const editContactName = document.getElementById('editContactName');
const editSortKey = document.getElementById('editSortKey');

// Edit Contact Modal elements
const closeEditModalBtn = document.querySelector('.close-btn-edit');
const cancelEditContactBtn = document.getElementById('cancelEditContactBtn');
const confirmEditContactBtn = document.getElementById('confirmEditContactBtn');
const editFullAddress = document.getElementById('editFullAddress');
const editContactSortKey = document.getElementById('editContactSortKey');

let currentEditingContact = null;

// Event listeners
openFileBtn.addEventListener('click', openFile);
loadDefaultBtn.addEventListener('click', loadDefaultContacts);
saveDefaultBtn.addEventListener('click', saveAsDefaultContacts);
saveBtn.addEventListener('click', saveFile);
saveAsBtn.addEventListener('click', saveAsFile);
addContactBtn.addEventListener('click', openAddContactModal);
deleteContactBtn.addEventListener('click', deleteSelectedContacts);
searchInput.addEventListener('input', filterContacts);
closeModalBtn.addEventListener('click', closeAddContactModal);
cancelAddBtn.addEventListener('click', closeAddContactModal);
confirmAddBtn.addEventListener('click', addNewContact);
closeSortModalBtn.addEventListener('click', closeEditSortKeyModal);
cancelEditSortBtn.addEventListener('click', closeEditSortKeyModal);
confirmEditSortBtn.addEventListener('click', saveEditedSortKey);
closeEditModalBtn.addEventListener('click', closeEditContactModal);
cancelEditContactBtn.addEventListener('click', closeEditContactModal);
confirmEditContactBtn.addEventListener('click', saveEditedContact);

// Close modals when clicking outside
addContactModal.addEventListener('click', (e) => {
  if (e.target === addContactModal) {
    closeAddContactModal();
  }
});

editSortKeyModal.addEventListener('click', (e) => {
  if (e.target === editSortKeyModal) {
    closeEditSortKeyModal();
  }
});

editContactModal.addEventListener('click', (e) => {
  if (e.target === editContactModal) {
    closeEditContactModal();
  }
});

// Intelligent last name extraction
function extractLastName(nameString) {
  // Remove common prefixes
  let name = nameString.trim();

  // Remove scare quotes and other quotation marks
  name = name.replace(/["'"'„"«»]/g, '');

  // Handle "The [Name]" format - extract the name after "The"
  if (name.toLowerCase().startsWith('the ')) {
    name = name.substring(4).trim();
  }

  // Handle "Mr.", "Mrs.", "Ms.", "Dr.", etc.
  name = name.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Rev\.|Fr\.|Major|Captain|Col\.|Lt\.)\s+/i, '');

  // Handle family formats like "The Smiths" or "Smith Family"
  if (name.toLowerCase().endsWith(' family')) {
    return name.substring(0, name.length - 7).trim();
  }

  // Handle "Name & Name" or "Name and Name" format
  // Split by & or and, then take the LAST person's name (after the separator)
  if (name.includes(' & ') || / and /i.test(name)) {
    // Split by & or and
    const parts = name.split(/ & | and /i);
    // Take the last part (second person's name)
    if (parts.length > 1) {
      name = parts[parts.length - 1].trim();
      // If the result is empty or just whitespace, use the first part instead
      if (!name) {
        name = parts[0].trim();
      }
    }
  }

  // Extract last word as last name (handles "John Smith", "John & Jane Smith", etc.)
  const words = name.split(/\s+/).filter(w => w.length > 0);

  // If there's only one word, return it
  if (words.length === 1) {
    return words[0];
  }

  // Filter out common conjunctions and prepositions that shouldn't be last names
  const filteredWords = words.filter(w => {
    const lower = w.toLowerCase();
    return lower !== 'and' && lower !== 'or' && lower !== '&' && lower !== 'the';
  });

  // If we have filtered words, use the last one; otherwise fall back to original last word
  if (filteredWords.length > 0) {
    return filteredWords[filteredWords.length - 1];
  }

  // Fallback to last word
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
    isDefaultContacts = false;
    // result.contacts is now an array of text blocks from table cells
    contacts = parseContactsFromArray(result.contacts);
    contacts = sortContacts(contacts);

    renderContacts();
    updateUI();
  } else {
    alert('Error reading file: ' + result.error);
  }
}

// Load default contacts
async function loadDefaultContacts() {
  const result = await window.electronAPI.loadDefaultContacts();

  if (result.success) {
    currentFilePath = null;
    isDefaultContacts = true;
    contacts = result.contacts;
    contacts = sortContacts(contacts);

    renderContacts();
    updateUI();
  } else {
    alert('No default contacts found. Create some contacts and click "Save as Default" to set them.');
  }
}

// Save current contacts as default
async function saveAsDefaultContacts() {
  const result = await window.electronAPI.saveDefaultContacts(contacts);

  if (result.success) {
    isDefaultContacts = true;
    currentFilePath = null;
    alert('Contacts saved as default! They will load automatically when you start the app.');
  } else {
    alert('Error saving default contacts: ' + result.error);
  }
}

// Save file
async function saveFile() {
  // If we're viewing default contacts, update the default file
  if (isDefaultContacts) {
    await saveAsDefaultContacts();
    return;
  }

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

    const contactDetails = document.createElement('div');
    contactDetails.className = 'contact-details';

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

    contactDetails.appendChild(nameDiv);
    contactDetails.appendChild(addressDiv);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '5px';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit-sort';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditContactModal(contact);
    });

    const editSortBtn = document.createElement('button');
    editSortBtn.className = 'btn-edit-sort';
    editSortBtn.textContent = 'Edit Sort';
    editSortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditSortKeyModal(contact);
    });

    buttonContainer.appendChild(editBtn);
    buttonContainer.appendChild(editSortBtn);

    contactInfo.appendChild(contactDetails);
    contactInfo.appendChild(buttonContainer);

    contactDiv.appendChild(checkbox);
    contactDiv.appendChild(contactInfo);

    contactDiv.addEventListener('click', (e) => {
      if (e.target !== checkbox && !e.target.classList.contains('btn-edit-sort')) {
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

// Open edit sort key modal
function openEditSortKeyModal(contact) {
  currentEditingContact = contact;
  editContactName.value = contact.name;
  editSortKey.value = contact.sortKey;
  editSortKeyModal.classList.add('active');
  editSortKey.focus();
  editSortKey.select();
}

// Close edit sort key modal
function closeEditSortKeyModal() {
  editSortKeyModal.classList.remove('active');
  currentEditingContact = null;
}

// Save edited sort key
function saveEditedSortKey() {
  if (!currentEditingContact) return;

  const newSortKey = editSortKey.value.trim();

  if (!newSortKey) {
    alert('Sort key cannot be empty');
    return;
  }

  currentEditingContact.sortKey = newSortKey.toUpperCase();
  contacts = sortContacts(contacts);

  renderContacts(searchInput.value);
  updateUI();
  closeEditSortKeyModal();
}

// Open edit contact modal
function openEditContactModal(contact) {
  currentEditingContact = contact;
  editFullAddress.value = contact.fullAddress;
  editContactSortKey.value = contact.sortKey;
  editContactModal.classList.add('active');
  editFullAddress.focus();
  editFullAddress.select();
}

// Close edit contact modal
function closeEditContactModal() {
  editContactModal.classList.remove('active');
  currentEditingContact = null;
}

// Save edited contact
function saveEditedContact() {
  if (!currentEditingContact) return;

  const newFullAddress = editFullAddress.value.trim();

  if (!newFullAddress) {
    alert('Contact address cannot be empty');
    return;
  }

  // Parse the new address
  const lines = newFullAddress.split('\n').map(l => l.trim()).filter(l => l);

  if (lines.length === 0) {
    alert('Contact address cannot be empty');
    return;
  }

  const name = lines[0];
  const addressLines = lines.slice(1);

  // Get sort key - either use provided value or auto-detect
  let sortKey = editContactSortKey.value.trim();
  if (!sortKey) {
    sortKey = extractLastName(name);
  }

  // Update the contact
  currentEditingContact.name = name;
  currentEditingContact.addressLines = addressLines;
  currentEditingContact.fullAddress = lines.join('\n');
  currentEditingContact.sortKey = sortKey.toUpperCase();

  contacts = sortContacts(contacts);

  renderContacts(searchInput.value);
  updateUI();
  closeEditContactModal();
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
  saveDefaultBtn.disabled = !hasContacts;
  updateDeleteButton();
  updateContactCount();
}

// Initialize - load default contacts on startup
async function initializeApp() {
  const result = await window.electronAPI.loadDefaultContacts();

  if (result.success) {
    isDefaultContacts = true;
    contacts = result.contacts;
    contacts = sortContacts(contacts);
    renderContacts();
  }

  updateUI();
}

// Start the app
initializeApp();
