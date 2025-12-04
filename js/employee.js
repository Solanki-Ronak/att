let allTrucks = []; // Store all trucks for filtering
let allAllowances = [];


function openTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));

    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');

    // Load data when specific tabs are opened
    if (tabName === 'allowances') {
        loadAllowances();
    } else if (tabName === 'diesel') {
        initializeDieselTab();
    } else if (tabName === 'truck-list') {
        restoreActiveEmployeeSubTab();
    }
    
    // Display last updated date for the active tab
    displayLastUpdatedDate(tabName);
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleEmployeeSearch);
    }
}

let currentEmployeeTrucksData = {
    'all-trucks': [],
    'no-truck': [],
    'left': []
};

// Function to display last updated date
async function displayLastUpdatedDate(tabName) {
    try {
        const { data, error } = await supabase
            .from('last_updated_dates')
            .select('last_updated')
            .eq('tab_name', tabName)
            .single();
        
        if (error) throw error;
        
        const date = data ? data.last_updated : new Date().toISOString();
        const formattedDate = formatLastUpdatedDate(date);
        
        const container = document.getElementById(`last-updated-${tabName}`);
        if (container) {
            container.innerHTML = `<small class="last-updated-text">Last updated: ${formattedDate}</small>`;
        }
    } catch (error) {
        console.error('Error fetching last updated date:', error);
        const container = document.getElementById(`last-updated-${tabName}`);
        if (container) {
            container.innerHTML = `<small class="last-updated-text">Last updated: Unknown</small>`;
        }
    }
}

// Format date as "06th Nov 2025" using local time
function formatLastUpdatedDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        
        // Convert to local timezone
        const localDate = new Date(date.getTime());
        
        const day = localDate.getDate();
        const month = localDate.toLocaleString('en-US', { month: 'short' });
        const year = localDate.getFullYear();
        
        // Add ordinal suffix to day
        const dayWithSuffix = day + (day % 10 === 1 && day !== 11 ? 'st' : 
                                    day % 10 === 2 && day !== 12 ? 'nd' : 
                                    day % 10 === 3 && day !== 13 ? 'rd' : 'th');
        
        return `${dayWithSuffix} ${month} ${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Unknown';
    }
}

function setupAllowanceSearch() {
    const searchInput = document.getElementById('allowanceSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleAllowanceSearch);
    }
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const resultsCount = document.getElementById('searchResultsCount');
    
    if (searchTerm === '') {
        displayTrucks(allTrucks);
        if (resultsCount) {
            resultsCount.textContent = `Showing all ${allTrucks.length} trucks`;
        }
        return;
    }
    
    const filteredTrucks = allTrucks.filter(truck => {
        return (
            (truck.truck_number && truck.truck_number.toLowerCase().includes(searchTerm)) ||
            (truck.driver_name && truck.driver_name.toLowerCase().includes(searchTerm)) ||
            (truck.driver_license && truck.driver_license.toLowerCase().includes(searchTerm)) ||
            (truck.driver_phone && truck.driver_phone.toLowerCase().includes(searchTerm)) ||
            (truck.truck_type && truck.truck_type.toLowerCase().includes(searchTerm)) ||
            (truck.truck_body && truck.truck_body.toLowerCase().includes(searchTerm)) ||
            (truck.truck_make && truck.truck_make.toLowerCase().includes(searchTerm)) ||
            (truck.truck_tons && truck.truck_tons.toLowerCase().includes(searchTerm))
        );
    });
    
    displayTrucks(filteredTrucks);
    if (resultsCount) {
        resultsCount.textContent = `Found ${filteredTrucks.length} of ${allTrucks.length} trucks`;
    }
}

function handleAllowanceSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const resultsCount = document.getElementById('allowanceSearchResultsCount');
    
    if (searchTerm === '') {
        displayAllowances(allAllowances);
        if (resultsCount) {
            resultsCount.textContent = `Showing all ${allAllowances.length} allowances`;
        }
        return;
    }
    
    const filteredAllowances = allAllowances.filter(allowance => {
        return (
            (allowance.source && allowance.source.toLowerCase().includes(searchTerm)) ||
            (allowance.destination && allowance.destination.toLowerCase().includes(searchTerm)) ||
            (allowance.comments && allowance.comments.toLowerCase().includes(searchTerm))
        );
    });
    
    displayAllowances(filteredAllowances);
    if (resultsCount) {
        resultsCount.textContent = `Found ${filteredAllowances.length} of ${allAllowances.length} allowances`;
    }
}
async function loadTrucks() {
    console.log('Loading trucks for employee side with display_order');
    
    // Load trucks for the currently active employee tab
    await loadTrucksByStatus(currentEmployeeTab);
    
    // Also load the other tabs in background
    await loadTrucksByStatus('no-truck');
    await loadTrucksByStatus('left');
}
async function loadAllowances() {
    const allowancesList = document.getElementById('allowances-list');
    
    try {
        const { data: allowances, error } = await supabase
            .from('allowances')
            .select('*')
            .order('source')
            .order('destination');

        if (error) throw error;

        allAllowances = allowances || [];

        if (allAllowances.length === 0) {
            allowancesList.innerHTML = '<div class="error">No allowances found in the database.</div>';
            return;
        }

        displayAllowances(allAllowances);
        const resultsCount = document.getElementById('allowanceSearchResultsCount');
        if (resultsCount) {
            resultsCount.textContent = `Showing all ${allAllowances.length} allowances`;
        }
    } catch (error) {
        console.error('Error loading allowances:', error);
        allowancesList.innerHTML = '<div class="error">Error loading allowances: ' + error.message + '</div>';
    }
}

function displayTrucks(trucks) {
    const trucksList = document.getElementById('trucks-list');
    if (!trucksList) return;
    
    if (trucks.length === 0) {
        trucksList.innerHTML = '<div class="no-results">No trucks found matching your search.</div>';
        return;
    }

    trucksList.innerHTML = '';
    trucks.forEach(truck => {
        const truckCard = createTruckCard(truck);
        trucksList.appendChild(truckCard);
    });
}
function createTruckCard(truck, index) {
    const card = document.createElement('div');
    card.className = 'truck-card';
    
    // Handle different status displays
    if (truck.status === 'no_truck') {
        // Driver with no truck
        const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
        
        const imageHtml = hasDriverImage ? 
            `<img src="${truck.driver_image_url}" alt="${truck.driver_name}" class="driver-image">` : '';
        
        // FORMAT PREVIOUS TRUCKS AS NUMBERED VERTICAL LIST
        const previousTrucksHtml = formatPreviousTrucksForCards(truck.previous_trucks);
        
        // Generate contacts HTML
        const contactsHtml = generateContactsHtml(truck.driver_contacts || []);
        
        // Prepare contacts text for copying - SINGLE LINE ONLY
        const contactsText = getContactsTextFromTruck(truck);
        const escapedContacts = contactsText.replace(/'/g, "\\'");
        
        card.innerHTML = `
            <div class="card-number">${index + 1}</div>
            ${imageHtml}
            
            <div class="truck-number no-assigned-truck">NO ASSIGNED TRUCK</div>
            
            <div class="driver-info">
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${truck.driver_name}</span>
                    <div class="copy-call-buttons">
                        <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_name.replace(/'/g, "\\'")}')">📋</button>
                    </div>
                </div>
                
                <div class="info-row">
                  <span class="info-label">D/License:</span>
                    <span class="info-value">${truck.driver_license}</span>
                    <div class="copy-call-buttons">
                        <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_license.replace(/'/g, "\\'")}')">📋</button>
                    </div>
                </div>
                
                ${contactsHtml}
                
                <div class="info-row previous-trucks-row">
                    <span class="info-label">Previous Trucks:</span>
                    <div class="previous-trucks-vertical">
                        ${previousTrucksHtml}
                    </div>
                </div>
            </div>
            
            <div class="button-row">
                <button class="btn btn-copy" onclick="copyTruckDetails('NO ASSIGNED TRUCK', '${truck.driver_name.replace(/'/g, "\\'")}', '${truck.driver_license.replace(/'/g, "\\'")}', '${escapedContacts}')">
                    📋 Copy Details
                </button>
                <button class="btn btn-details" onclick="openEmployeeDriverNoTruckDetails('${truck.id}')">
                    ℹ️ More Details
                </button>
            </div>
        `;
        
    } else if (truck.status === 'left') {
        // Driver who left
        const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
        
        const imageHtml = hasDriverImage ? 
            `<img src="${truck.driver_image_url}" alt="${truck.driver_name}" class="driver-image">` : '';
        
        // FORMAT PREVIOUS TRUCKS AS NUMBERED VERTICAL LIST
        const previousTrucksHtml = formatPreviousTrucksForCards(truck.previous_trucks);
        
        // Generate contacts HTML
        const contactsHtml = generateContactsHtml(truck.driver_contacts || []);
        
        // Prepare contacts text for copying - SINGLE LINE ONLY
        const contactsText = getContactsTextFromTruck(truck);
        const escapedContacts = contactsText.replace(/'/g, "\\'");
        
        card.innerHTML = `
            <div class="card-number">${index + 1}</div>
            ${imageHtml}
            
            <div class="truck-number left-company">LEFT COMPANY</div>
            
            <div class="driver-info">
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${truck.driver_name}</span>
                    <div class="copy-call-buttons">
                        <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_name.replace(/'/g, "\\'")}')">📋</button>
                    </div>
                </div>
                
                <div class="info-row">
                <span class="info-label">D/License:</span>
                    <span class="info-value">${truck.driver_license}</span>
                    <div class="copy-call-buttons">
                        <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_license.replace(/'/g, "\\'")}')">📋</button>
                    </div>
                </div>
                
                ${contactsHtml}
                
                <div class="info-row previous-trucks-row">
                    <span class="info-label">Previous Trucks:</span>
                    <div class="previous-trucks-vertical">
                        ${previousTrucksHtml}
                    </div>
                </div>
            </div>
            
            <div class="button-row">
                <button class="btn btn-copy" onclick="copyTruckDetails('LEFT COMPANY', '${truck.driver_name.replace(/'/g, "\\'")}', '${truck.driver_license.replace(/'/g, "\\'")}', '${escapedContacts}')">
                    📋 Copy Details
                </button>
                <button class="btn btn-details" onclick="openEmployeeDriverNoTruckDetails('${truck.id}')">
                    ℹ️ More Details
                </button>
            </div>
        `;
        
    } else {
        // Active driver-truck pair OR truck with NO DRIVER
        const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
        
        const imageHtml = hasDriverImage ? 
            `<img src="${truck.driver_image_url}" alt="${truck.driver_name}" class="driver-image">` : '';
        
        // Check if this is a truck with NO DRIVER
        const isNoDriver = truck.driver_name === 'NO DRIVER' || !truck.driver_name;
        
        if (isNoDriver) {
            // Truck with NO DRIVER
            card.innerHTML = `
                <div class="card-number">${index + 1}</div>
                <div class="truck-number">${truck.truck_number}</div>
                
                <div class="driver-info">
                    <div class="info-row">
                        <span class="info-label">Name:</span>
                        <span class="info-value no-driver-text">NO DRIVER</span>
                    </div>
                    
                    <div class="info-row">
                      <span class="info-label">D/License:</span>
                        <span class="info-value empty-field">-</span>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">Contact:</span>
                        <span class="info-value empty-field">-</span>
                    </div>
                </div>
                
                <div class="button-row">
                    <button class="btn btn-copy" onclick="copyTruckDetails('${truck.truck_number.replace(/'/g, "\\'")}', 'NO DRIVER', '', '')">
                        📋 Copy Details
                    </button>
                    <button class="btn btn-details" onclick="openEmployeeNoDriverDetails('${truck.id}')">
                        ℹ️ More Details
                    </button>
                </div>
            `;
        } else {
            // Active driver-truck pair
            // Generate contacts HTML
            const contactsHtml = generateContactsHtml(truck.driver_contacts || []);
            
            // Prepare contacts text for copying - SINGLE LINE ONLY
            const contactsText = getContactsTextFromTruck(truck);
            const escapedContacts = contactsText.replace(/'/g, "\\'");
            
            card.innerHTML = `
                <div class="card-number">${index + 1}</div>
                ${imageHtml}
                
                <div class="truck-number">${truck.truck_number}</div>
                
                <div class="driver-info">
                    <div class="info-row">
                        <span class="info-label">Name:</span>
                        <span class="info-value">${truck.driver_name}</span>
                        <div class="copy-call-buttons">
                            <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_name.replace(/'/g, "\\'")}')">📋</button>
                        </div>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">License:</span>
                        <span class="info-value">${truck.driver_license}</span>
                        <div class="copy-call-buttons">
                            <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_license.replace(/'/g, "\\'")}')">📋</button>
                        </div>
                    </div>
                    
                    ${contactsHtml}
                </div>
                
                <div class="button-row">
                    <button class="btn btn-copy" onclick="copyTruckDetails('${truck.truck_number.replace(/'/g, "\\'")}', '${truck.driver_name.replace(/'/g, "\\'")}', '${truck.driver_license.replace(/'/g, "\\'")}', '${escapedContacts}')">
                        📋 Copy Details
                    </button>
                    <button class="btn btn-details" onclick="openDetailsModal('${truck.id}')">
                        ℹ️ More Details
                    </button>
                </div>
            `;
        }
    }
    
    return card;
}
// NEW FUNCTION: Format previous trucks as numbered vertical list for cards
function formatPreviousTrucksForCards(previousTrucks) {
    if (!previousTrucks) {
        return '<span class="no-previous-trucks">No previous trucks</span>';
    }
    
    const trucksArray = previousTrucks.split(', ').filter(t => t.trim() !== '');
    
    if (trucksArray.length === 0) {
        return '<span class="no-previous-trucks">No previous trucks</span>';
    }
    
    return trucksArray.map((truckNum, index) => 
        `<div class="previous-truck-item">${index + 1}. ${truckNum}</div>`
    ).join('');
}
function generateContactsHtml(contacts) {
    if (!contacts || contacts.length === 0) {
        return `
            <div class="info-row">
                <span class="info-label">Contact:</span>
                <span class="info-value empty-field">-</span>
            </div>
        `;
    }
    
    let contactsHtml = '';
    
    if (contacts.length === 1) {
        // Single contact - show as "Contact: 07531123213"
        contactsHtml = `
            <div class="info-row">
                <span class="info-label">Contact:</span>
                <span class="info-value">${contacts[0].phone_number}</span>
                <div class="copy-call-buttons">
                    <button class="btn btn-copy" onclick="copyToClipboard('${contacts[0].phone_number.replace(/'/g, "\\'")}')">📋</button>
                    <button class="btn btn-call" onclick="callDriver('${contacts[0].phone_number.replace(/'/g, "\\'")}')">📞</button>
                </div>
            </div>
        `;
    } else {
        // Multiple contacts - show each individually with numbers
        contacts.forEach((contact, index) => {
            contactsHtml += `
                <div class="info-row">
                    <span class="info-label">Contact ${index + 1}:</span>
                    <span class="info-value">${contact.phone_number}</span>
                    <div class="copy-call-buttons">
                        <button class="btn btn-copy" onclick="copyToClipboard('${contact.phone_number.replace(/'/g, "\\'")}')">📋</button>
                        <button class="btn btn-call" onclick="callDriver('${contact.phone_number.replace(/'/g, "\\'")}')">📞</button>
                    </div>
                </div>
            `;
        });
    }
    
    return contactsHtml;
}
function getContactsTextFromTruck(truck) {
    if (!truck || !truck.driver_contacts || truck.driver_contacts.length === 0) {
        return 'No contacts';
    }
    
    // Handle array of contacts
    if (Array.isArray(truck.driver_contacts)) {
        if (truck.driver_contacts.length === 1) {
            // Single contact: "Contact: 07531123213"
            return `Contact: ${truck.driver_contacts[0].phone_number}`;
        } else {
            // Multiple contacts: "Contacts: 07531123213, 0713123123"
            const phoneNumbers = truck.driver_contacts.map(contact => contact.phone_number);
            return `Contacts: ${phoneNumbers.join(', ')}`;
        }
    }
    
    return 'No contacts';
}
// Helper function to get all contacts as text
function getAllContactsText(contacts) {
    if (!contacts || contacts.length === 0) return '';
    return contacts.map(contact => contact.phone_number).join(', ');
}
function copyTruckDetails(truckNumber, name, license, contacts) {
    console.log("Copying:", { truckNumber, name, license, contacts });
    
    // Convert contacts back to multi-line if needed
    let formattedContacts = contacts;
    if (contacts.includes(' | ')) {
        formattedContacts = contacts.replace(/\s*\|\s*/g, '\n');
    }
    
   const details = `Truck: ${truckNumber}\nName: ${name}\nD/License: ${license}\n${formattedContacts}`;
    
    navigator.clipboard.writeText(details).then(() => {
        showNotification('All details copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy details');
    });
}
async function openEmployeeNoDriverDetails(truckId) {
    try {
        const { data: truck, error } = await supabase
            .from('trucks')
            .select('*')
            .eq('id', truckId)
            .single();

        if (error) throw error;

        // Close any existing modal first
        if (currentModalElement) {
            currentModalElement.remove();
        }
        
        // Reset scroll positions
        resetModalScroll();
        
        const modal = document.createElement('div');
        modal.className = 'modal fresh-modal'; // Add fresh-modal class
        modal.style.display = 'block';
        
        // Add a wrapper to control positioning
        const modalWrapper = document.createElement('div');
        modalWrapper.className = 'modal-wrapper';
        modalWrapper.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow-y: auto;
            z-index: 1000;
            background-color: rgba(0,0,0,0.5);
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 20px 0;
        `;
        
        const hasTruckImage = truck.truck_image_url && truck.truck_image_url !== '';
        
        const truckImageHtml = hasTruckImage ? 
            `<img src="${truck.truck_image_url}" alt="Truck" class="truck-image">` : '';
        
        // Generate COMESA/C28 expiry sections conditionally
        const comesaExpiryHtml = truck.comesa === 'YES' ? 
            `<div class="detail-item">
                <span class="detail-label">COMESA Expiry:</span>
                <span class="detail-value">${truck.comesa_expiry ? formatDate(truck.comesa_expiry) : 'Not set'}</span>
            </div>` : '';
        
        const c28ExpiryHtml = truck.c28 === 'YES' ? 
            `<div class="detail-item">
                <span class="detail-label">C28 Expiry:</span>
                <span class="detail-value">${truck.c28_expiry ? formatDate(truck.c28_expiry) : 'Not set'}</span>
            </div>` : '';

        modalWrapper.innerHTML = `
            <div class="modal-content modal-large" style="margin: auto 0px; max-height: 90vh; overflow: hidden;">
                <span class="close" onclick="closeCurrentModal()" style="position: absolute; top: 10px; right: 20px; z-index: 1001;">&times;</span>
                <h2 style="margin-top: 10px;">🚛 Truck Details - No Driver Assigned</h2>
               <div class="modal-scroll-container" style="max-height: 60vh; overflow-y: auto; ">
                    <div class="details-grid">
                        <div class="detail-section no-image">
                            <h3>Truck Information</h3>
                            
                            <div class="detail-item">
                                <span class="detail-label">Truck Number:</span>
                                <span class="detail-value">${truck.truck_number}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Driver Name:</span>
                                <span class="detail-value no-driver-text">NO DRIVER</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">License:</span>
                                <span class="detail-value empty-field">-</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Driving License :</span>
                                <span class="detail-value empty-field">-</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Contact:</span>
                                <span class="detail-value empty-field">-</span>
                            </div>
                        </div>
                        
                        <div class="detail-section ${!hasTruckImage ? 'no-image' : ''}">
                            <h3>Truck Specifications</h3>
                            ${truckImageHtml}
                            
                            <div class="detail-item">
                                <span class="detail-label">Truck Type:</span>
                                <span class="detail-value">${truck.truck_type || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Truck Body:</span>
                                <span class="detail-value">${truck.truck_body || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Make:</span>
                                <span class="detail-value">${truck.truck_make || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Tons:</span>
                                <span class="detail-value">${truck.truck_tons || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">COMESA:</span>
                                <span class="detail-value">${truck.comesa || 'NO'}</span>
                            </div>
                            ${comesaExpiryHtml}
                            <div class="detail-item">
                                <span class="detail-label">C28:</span>
                                <span class="detail-value">${truck.c28 || 'NO'}</span>
                            </div>
                            ${c28ExpiryHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.appendChild(modalWrapper);
        document.body.appendChild(modal);
        
        // Track this modal for back button functionality
        trackModalCreation(modal);
        
       // Force scroll reset after modal is created
setTimeout(() => {
    // Reset all scrollable containers
    const scrollContainers = modal.querySelectorAll('.modal-scroll-container, .modal-content, .modal-wrapper');
    scrollContainers.forEach(container => {
        container.scrollTop = 0;
    });
    
  
 
}, 10);
        
        // Close modal when clicking outside
        modalWrapper.onclick = function(event) {
            if (event.target === modalWrapper) {
                closeCurrentModal();
            }
        };
        
    } catch (error) {
        console.error('Error loading truck details:', error);
        alert('Error loading truck details');
    }
}
async function openEmployeeDriverNoTruckDetails(truckId) {
    try {
        const { data: truck, error } = await supabase
            .from('trucks')
            .select(`
                *,
                driver_contacts (*)
            `)
            .eq('id', truckId)
            .single();

        if (error) throw error;

        // Close any existing modal first
        if (currentModalElement) {
            currentModalElement.remove();
        }
        
        // Reset scroll positions
        resetModalScroll();
        
        const modal = document.createElement('div');
        modal.className = 'modal fresh-modal';
        modal.style.display = 'block';
        
        // Add a wrapper to control positioning
        const modalWrapper = document.createElement('div');
        modalWrapper.className = 'modal-wrapper';
        modalWrapper.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow-y: auto;
            z-index: 1000;
            background-color: rgba(0,0,0,0.5);
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 20px 0;
        `;
        
        const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
        const hasLicenseDoc = truck.driver_license_url && truck.driver_license_url !== '';
        
        const driverImageHtml = hasDriverImage ? 
            `<img src="${truck.driver_image_url}" alt="Driver" class="driver-image">` : '';
        
        // Generate license actions HTML
        const licenseActionsHtml = hasLicenseDoc ? 
            `<div class="license-actions">
                <button class="btn-view" onclick="viewLicenseDocumentFromUrl('${truck.driver_license_url}')">View </button>
             </div>` :
            '<span style="color: #666;"></span>';
        
        // Generate contacts HTML for details modal
        const contactsHtml = generateDetailsContactsHtml(truck.driver_contacts);
        
        const statusTitle = truck.status === 'no_truck' ? 'No Truck Assigned' : 'Left Company';
        
        modalWrapper.innerHTML = `
            <div class="modal-content modal-large" style="margin: auto 0px; max-height: 90vh; overflow: hidden;">
                <span class="close" onclick="closeCurrentModal()" style="position: absolute; top: 10px; right: 20px; z-index: 1001;">&times;</span>
                <h2 style="margin-top: 10px;">👨‍💼 Driver Details - ${statusTitle}</h2>
                <div class="modal-scroll-container" style="max-height: 60vh; overflow-y: auto; ">
                    <div class="details-grid">
                        <div class="detail-section ${!hasDriverImage ? 'no-image' : ''}">
                            <h3>Driver Information</h3>
                            ${driverImageHtml}
                            
                            <div class="detail-item">
                                <span class="detail-label">Driver Name:</span>
                                <span class="detail-value">${truck.driver_name}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">License:</span>
                                <span class="detail-value">${truck.driver_license}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Driving License :</span>
                                <span class="detail-value">${licenseActionsHtml}</span>
                            </div>
                            ${contactsHtml}
                        </div>
                        
                        <div class="detail-section no-image">
                            <h3>Additional Information</h3>
                            <div class="detail-item full-width">
                                <div class="previous-trucks-heading">Previous Trucks</div>
                                <div class="previous-trucks-list">
                                    ${formatPreviousTrucksForDetails(truck.previous_trucks)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.appendChild(modalWrapper);
        document.body.appendChild(modal);
        
        // Track this modal for back button functionality
        trackModalCreation(modal);
        
     // Force scroll reset after modal is created
setTimeout(() => {
    // Reset all scrollable containers
    const scrollContainers = modal.querySelectorAll('.modal-scroll-container, .modal-content, .modal-wrapper');
    scrollContainers.forEach(container => {
        container.scrollTop = 0;
    });
    
   
}, 10);
        
        // Close modal when clicking outside
        modalWrapper.onclick = function(event) {
            if (event.target === modalWrapper) {
                closeCurrentModal();
            }
        };
        
    } catch (error) {
        console.error('Error loading driver details:', error);
        alert('Error loading driver details');
    }
}
function generateDetailsContactsHtml(contacts) {
    if (!contacts || contacts.length === 0) {
        return `
            <div class="detail-item">
                <span class="detail-label">Contact:</span>
                <span class="detail-value empty-field">-</span>
            </div>
        `;
    }
    
    let contactsHtml = '';
    
    if (contacts.length === 1) {
        // Single contact
        contactsHtml = `
            <div class="detail-item">
                <span class="detail-label">Contact:</span>
                <span class="detail-value">${contacts[0].phone_number}</span>
            </div>
        `;
    } else {
        // Multiple contacts
        contacts.forEach((contact, index) => {
            contactsHtml += `
                <div class="detail-item">
                    <span class="detail-label">Contact ${index + 1}:</span>
                    <span class="detail-value">${contact.phone_number}</span>
                </div>
            `;
        });
    }
    
    return contactsHtml;
}
function displayAllowances(allowances) {
    const allowancesList = document.getElementById('allowances-list');
    if (!allowancesList) return;
    
    if (allowances.length === 0) {
        allowancesList.innerHTML = '<div class="no-results">No allowances found matching your search.</div>';
        return;
    }

    let tableHTML = `
        <table class="allowances-table employee-view">
            <thead>
                <tr>
                    <th>Source</th>
                    <th>DESTINATION</th>
                    <th>DRIVER'S POSHO</th>
                    <th>T/BOY'S POSHO</th>
                    <th>COMMENTS</th>
                </tr>
            </thead>
            <tbody>
    `;

    allowances.forEach(allowance => {
        // Capitalize source, destination, and comments
        const source = allowance.source ? allowance.source.toUpperCase() : '';
        const destination = allowance.destination ? allowance.destination.toUpperCase() : '';
        const comments = allowance.comments ? allowance.comments.toUpperCase() : 'NONE';
        
        tableHTML += `
            <tr>
                <td>${source}</td>
                <td>${destination}</td>
                <td class="amount-cell">${formatCurrency(allowance.driver_posho)}</td>
                <td class="amount-cell">${formatCurrency(allowance.tboy_posho)}</td>
                <td class="comments-cell" title="${comments}">${comments}</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    allowancesList.innerHTML = tableHTML;
}

function formatCurrency(amount) {
    if (!amount) return '0';
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function copyToClipboard(text) {
    if (!text || text === '-' || text === '') {
        showNotification('Nothing to copy');
        return;
    }
    
    // Clean up text
    const cleanedText = text.replace(/\\'/g, "'");
    
    navigator.clipboard.writeText(cleanedText).then(() => {
        showNotification('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy to clipboard');
    });
}
function copyAllDetails(truckNumber, name, license, phone) {
    const details = `${truckNumber}\nName: ${name}\nLicense: ${license}\nContact: ${phone}`;
    navigator.clipboard.writeText(details).then(() => {
        showNotification('All details copied to clipboard!');
    }).catch(err => {
        console.ezrror('Failed to copy: ', err);
        showNotification('Failed to copy details');
    });
}

function callDriver(phone) {
    if (!phone) {
        showNotification('No phone number available');
        return;
    }
    
    // Open phone dialpad directly without confirmation
    window.open(`tel:${phone}`, '_self');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}
// Update the existing detailsModal setup to include back button functionality
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('detailsModal');
    const closeBtn = document.querySelector('#detailsModal .close');
    
    if (closeBtn) {
        closeBtn.onclick = function() {
            closeDetailsModal(); // Use new function
        }
    }
    
    // Setup back button for the detailsModal
    window.addEventListener('popstate', function(event) {
        if (modal && modal.style.display === 'block') {
            closeDetailsModal();
        }
    });
});

// New function to handle closing the detailsModal
function closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
        modal.style.display = 'none';
        
        // Only go back if we're in a modal state
        if (history.state && history.state.modalOpen) {
            history.back();
        }
    }
}

async function openDetailsModal(truckId) {
    const modal = document.getElementById('detailsModal');
    const modalContent = document.getElementById('modalContent');
    
    if (!modal || !modalContent) return;
    
    try {
         resetModalScroll();
        
        const { data: truck, error } = await supabase
            .from('trucks')
            .select(`
                *,
                driver_contacts (*)
            `)
            .eq('id', truckId)
            .single();

        if (error) throw error;

        const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
        const hasTruckImage = truck.truck_image_url && truck.truck_image_url !== '';
        const hasLicenseDoc = truck.driver_license_url && truck.driver_license_url !== '';
        
        const driverImageHtml = hasDriverImage ? 
            `<img src="${truck.driver_image_url}" alt="Driver" class="driver-image">` : '';
        
        const truckImageHtml = hasTruckImage ? 
            `<img src="${truck.truck_image_url}" alt="Truck" class="truck-image">` : '';
        
        // Generate license actions HTML
        const licenseActionsHtml = hasLicenseDoc ? 
            `<div class="license-actions">
                <button class="btn-view" onclick="viewLicenseDocumentFromUrl('${truck.driver_license_url}')">View</button>
             </div>` :
            '<span style="color: #666;"></span>';
        
        // Generate contacts HTML for details modal
        const contactsHtml = generateDetailsContactsHtml(truck.driver_contacts);
        
        // Generate COMESA/C28 expiry sections conditionally
        const comesaExpiryHtml = truck.comesa === 'YES' ? 
            `<div class="detail-item">
                <span class="detail-label">COMESA Expiry:</span>
                <span class="detail-value">${truck.comesa_expiry ? formatDate(truck.comesa_expiry) : 'Not set'}</span>
            </div>` : '';
        
        const c28ExpiryHtml = truck.c28 === 'YES' ? 
            `<div class="detail-item">
                <span class="detail-label">C28 Expiry:</span>
                <span class="detail-value">${truck.c28_expiry ? formatDate(truck.c28_expiry) : 'Not set'}</span>
            </div>` : '';

        modalContent.innerHTML = `
            <div class="details-grid">
                <div class="detail-section ${!hasDriverImage ? 'no-image' : ''}">
                    <h3>Driver Information</h3>
                    ${driverImageHtml}
                    
                    <div class="detail-item">
                        <span class="detail-label">Truck Number:</span>
                        <span class="detail-value">${truck.truck_number}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Driver Name:</span>
                        <span class="detail-value">${truck.driver_name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">License:</span>
                        <span class="detail-value">${truck.driver_license}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Driving License :</span>
                        <span class="detail-value">${licenseActionsHtml}</span>
                    </div>
                    ${contactsHtml}
                </div>
                
                <div class="detail-section ${!hasTruckImage ? 'no-image' : ''}">
                    <h3>Truck Specifications</h3>
                    ${truckImageHtml}
                    
                    <div class="detail-item">
                        <span class="detail-label">Truck Type:</span>
                        <span class="detail-value">${truck.truck_type || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Truck Body:</span>
                        <span class="detail-value">${truck.truck_body || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Make:</span>
                        <span class="detail-value">${truck.truck_make || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Tons:</span>
                        <span class="detail-value">${truck.truck_tons || 'N/A'}</span>
                    </div>
                    
                    <div class="detail-item">
                        <span class="detail-label">COMESA:</span>
                        <span class="detail-value">${truck.comesa || 'NO'}</span>
                    </div>
                    ${comesaExpiryHtml}
                    <div class="detail-item">
                        <span class="detail-label">C28:</span>
                        <span class="detail-value">${truck.c28 || 'NO'}</span>
                    </div>
                    ${c28ExpiryHtml}
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
        
       // Force scroll reset after modal is created
setTimeout(() => {
    // Reset all scrollable containers
    const scrollContainers = modal.querySelectorAll('.modal-scroll-container, .modal-content, .modal-wrapper');
    scrollContainers.forEach(container => {
        container.scrollTop = 0;
    });
    
   
}, 10);
        
        // Push state to history for back button functionality
        history.pushState({ modalOpen: true }, '', '');
        
    } catch (error) {
        console.error('Error loading truck details:', error);
        alert('Error loading truck details');
    }
}
// Update the window.onclick function
window.onclick = function(event) {
    const modal = document.getElementById('detailsModal');
    if (event.target === modal) {
        closeDetailsModal(); // Use new function
    }
    
    // Also handle dynamically created modals
    if (currentModalElement && event.target === currentModalElement) {
        closeCurrentModal();
    }
}
// Close modal when clicking on X or outside
document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.querySelector('#detailsModal .close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            const modal = document.getElementById('detailsModal');
            if (modal) modal.style.display = 'none';
        }
    }
});

window.onclick = function(event) {
    const modal = document.getElementById('detailsModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Employee tab management
let currentEmployeeTab = 'all-trucks';


function displayTrucksInContainer(trucks, containerId) {
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error(`Container with id '${containerId}' not found`);
        return;
    }
    
    if (!trucks || trucks.length === 0) {
        container.innerHTML = '<div class="no-results">No trucks found.</div>';
        return;
    }
    
    container.innerHTML = '';
    
    // Create cards with independent numbering starting from 1
    trucks.forEach((truck, index) => {
        const truckCard = createTruckCard(truck, index);
        container.appendChild(truckCard);
    });
}

// Filter state
let activeFilters = {
    no_driver: false,
    comesa: false,
    c28: false
};

// Initialize filters
function initializeFilters() {
    const filterCheckboxes = document.querySelectorAll('.filter-checkbox input');
    
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleFilterChange);
    });
}

// Handle filter changes
function handleFilterChange(event) {
    const filterType = event.target.value;
    activeFilters[filterType] = event.target.checked;
    
    updateFilterUI();
    applyFiltersToCurrentTab();
}

function applyFiltersToData(trucks, containerId) {
    if (!trucks || trucks.length === 0) return;
    
    let filteredTrucks = trucks;
    
    // Get active filter types
    const activeFilterTypes = Object.keys(activeFilters).filter(key => activeFilters[key]);
    
    if (activeFilterTypes.length > 0) {
        filteredTrucks = trucks.filter(truck => {
            // Check if both COMESA and C28 filters are active
            const bothFiltersActive = activeFilters.comesa && activeFilters.c28;
            
            if (bothFiltersActive) {
                // When both filters are active, require BOTH to be YES
                return truck.comesa === 'YES' && truck.c28 === 'YES';
            } else {
                // Normal behavior when only one or neither filter is active
                return activeFilterTypes.some(filterType => {
                    switch (filterType) {
                        case 'no_driver':
                            return truck.driver_name === 'NO DRIVER' || !truck.driver_name || truck.driver_name === '';
                        case 'comesa':
                            return truck.comesa === 'YES';
                        case 'c28':
                            return truck.c28 === 'YES';
                        default:
                            return false;
                    }
                });
            }
        });
        
        // ADD THIS: Maintain display_order after filtering
        filteredTrucks.sort((a, b) => {
            const orderA = a.display_order || 999999;
            const orderB = b.display_order || 999999;
            return orderA - orderB;
        });
    }
    
    // Display with fresh numbering starting from 1
    displayTrucksInContainer(filteredTrucks, containerId);
    
    // Update results count
    const resultsCount = document.getElementById('searchResultsCount');
    if (resultsCount) {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        if (searchTerm === '') {
            resultsCount.textContent = `Showing ${filteredTrucks.length} of ${trucks.length} items`;
        }
    }
}

let filterTimeout;

// Toggle dropdown with auto-close timer
function toggleFilterDropdown() {
    const dropdown = document.querySelector('.filter-dropdown');
    const isActive = dropdown.classList.contains('active');
    
    // Clear any existing timeout
    if (filterTimeout) {
        clearTimeout(filterTimeout);
        filterTimeout = null;
    }
    
    if (isActive) {
        // If already active, close it
        dropdown.classList.remove('active');
    } else {
        // If not active, open it and set auto-close timer
        dropdown.classList.add('active');
        
        // Set timeout to auto-close after 8 seconds
        filterTimeout = setTimeout(() => {
            dropdown.classList.remove('active');
            filterTimeout = null;
        }, 3000); 
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const filterContainer = document.getElementById('filterContainer');
    const dropdown = document.querySelector('.filter-dropdown');
    
    if (filterContainer && filterContainer.style.display !== 'none' && 
        !filterContainer.contains(event.target) && 
        dropdown && dropdown.classList.contains('active')) {
        
        dropdown.classList.remove('active');
        
        // Clear the auto-close timeout when manually closed
        if (filterTimeout) {
            clearTimeout(filterTimeout);
            filterTimeout = null;
        }
    }
});

// Reset timer when user interacts with filter options
document.addEventListener('click', function(event) {
    const dropdown = document.querySelector('.filter-dropdown');
    
    // If dropdown is active and user clicks on a filter option
    if (dropdown && dropdown.classList.contains('active') && 
        event.target.closest('.filter-option')) {
        
        // Reset the 8-second timer
        if (filterTimeout) {
            clearTimeout(filterTimeout);
        }
        
        filterTimeout = setTimeout(() => {
            dropdown.classList.remove('active');
            filterTimeout = null;
        }, 3000);
    }
});
// Toggle individual filter
function toggleFilter(filterType) {
    activeFilters[filterType] = !activeFilters[filterType];
    updateFilterUI();
    applyFiltersToCurrentTab();
    
    // Update the option visual state
    const option = event.target.closest('.filter-option');
    if (activeFilters[filterType]) {
        option.classList.add('active');
    } else {
        option.classList.remove('active');
    }
}
// Update employee filter UI - Matching admin style
function updateFilterUI() {
    const activeCount = Object.values(activeFilters).filter(Boolean).length;
    const activeFilterCount = document.getElementById('activeFilterCount');
    const filterStatus = document.getElementById('filterStatus'); // You might need to add this element
    
    // Update the filter count badge
    if (activeFilterCount) {
        activeFilterCount.textContent = activeCount;
    }
    
    // Update filter status text (if you have this element)
    if (filterStatus) {
        if (activeCount === 0) {
            filterStatus.textContent = 'All';
        } else if (activeCount === 1) {
            // Show which single filter is active
            const activeFilter = Object.keys(activeFilters).find(key => activeFilters[key]);
            filterStatus.textContent = getFilterDisplayName(activeFilter);
        } else {
            filterStatus.textContent = `${activeCount} active`;
        }
    }
    
    // Update individual option states
    Object.keys(activeFilters).forEach(filterType => {
        const option = document.querySelector(`[onclick="toggleFilter('${filterType}')"]`);
        if (option) {
            if (activeFilters[filterType]) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        }
    });
}


// Get display name for filters
function getFilterDisplayName(filterType) {
    const names = {
        'no_driver': 'No Driver',
        'comesa': 'COMESA',
        'c28': 'C28'
    };
    return names[filterType] || filterType;
}
async function loadTrucksByStatus(statusTab) {
    const statusMap = {
        'all-trucks': ['active'],
        'no-truck': ['no_truck'], 
        'left': ['left']
    };
    
    const containerMap = {
        'all-trucks': 'trucks-list',
        'no-truck': 'no-truck-list',
        'left': 'left-list'
    };
    
    const statuses = statusMap[statusTab];
    const containerId = containerMap[statusTab];
    
    try {
        let query = supabase
            .from('trucks')
            .select(`
                *,
                driver_contacts (*)
            `);
            
        if (statusTab === 'all-trucks') {
            query = query.eq('status', 'active');
        } else {
            query = query.in('status', statuses);
        }
        
        // ADD THIS: Order by display_order first, then truck_number
        const { data: trucks, error } = await query
            .order('display_order', { ascending: true, nullsFirst: false })
            .order('truck_number');
        
        if (error) throw error;
        
        // Store the data
        currentEmployeeTrucksData[statusTab] = trucks || [];
        
        console.log(`Loaded ${trucks?.length || 0} trucks for ${statusTab} with display_order`);
        
        // Only apply filters if we're on the All Drivers/Trucks tab
        if (statusTab === 'all-trucks') {
            applyFiltersToData(trucks, containerId);
        } else {
            // For other tabs, display without filters
            displayTrucksInContainer(trucks, containerId);
        }
        
        // Clear search results count
        const resultsCount = document.getElementById('searchResultsCount');
        if (resultsCount) {
            resultsCount.textContent = '';
        }
        
    } catch (error) {
        console.error('Error loading trucks:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="error">Error loading trucks</div>';
        }
    }
}
// Clear all filters - Updated for icon version
function clearAllFilters() {
    activeFilters = {
        no_driver: false,
        comesa: false,
        c28: false
    };
    
    // Remove active classes from all options
    document.querySelectorAll('.filter-option').forEach(option => {
        option.classList.remove('active');
    });
    
    updateFilterUI();
    applyFiltersToCurrentTab();
    
    // Close dropdown after clearing
    const dropdown = document.querySelector('.filter-dropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}


// NEW FUNCTION: Restore active employee sub-tab
function restoreActiveEmployeeSubTab() {
    // Check if we have a stored active sub-tab, otherwise default to 'all-trucks'
    const activeSubTab = currentEmployeeTab || 'all-trucks';
    
    // Update the UI to show the correct active sub-tab
    document.querySelectorAll('.secondary-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.employee-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Activate the stored sub-tab
    const activeTabElement = document.querySelector(`[onclick="openEmployeeTab('${activeSubTab}')"]`);
    const activeContent = document.getElementById(activeSubTab);
    
    if (activeTabElement && activeContent) {
        activeTabElement.classList.add('active');
        activeContent.classList.add('active');
        
        // Load the data for this sub-tab
        loadTrucksByStatus(activeSubTab);
        
        // Update filter container visibility
        updateEmployeeFilterVisibility(activeSubTab);
    }
}

// NEW FUNCTION: Update employee filter visibility
function updateEmployeeFilterVisibility(activeSubTab) {
    const filterContainer = document.getElementById('filterContainer');
    if (filterContainer) {
        if (activeSubTab === 'all-trucks') {
            filterContainer.style.display = 'block';
        } else {
            filterContainer.style.display = 'none';
        }
    }
}

// UPDATED: openEmployeeTab function to store the current sub-tab
function openEmployeeTab(tabName) {
    currentEmployeeTab = tabName; // STORE the current sub-tab
    
    // Update active tab
    document.querySelectorAll('.secondary-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Show active content
    document.querySelectorAll('.employee-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Update filter container visibility
    updateEmployeeFilterVisibility(tabName);

    // Load appropriate data
    loadTrucksByStatus(tabName);
}
// Initialize filters when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateFilterUI();
});
// Update the applyFiltersToCurrentTab function to handle no-filter tabs
function applyFiltersToCurrentTab() {
    const activeEmployeeTab = document.querySelector('.employee-tab-content.active').id;
    const currentData = currentEmployeeTrucksData[activeEmployeeTab];
    
    if (!currentData || currentData.length === 0) {
        loadTrucksByStatus(activeEmployeeTab);
        return;
    }
    
    const containerMap = {
        'all-trucks': 'trucks-list',
        'no-truck': 'no-truck-list',
        'left': 'left-list'
    };
    
    const containerId = containerMap[activeEmployeeTab];
    
    // Only apply filters if we're on the All Drivers/Trucks tab
    if (activeEmployeeTab === 'all-trucks') {
        applyFiltersToData(currentData, containerId);
    } else {
        // For other tabs, just display the data without filters
        displayTrucksInContainer(currentData, containerId);
        
        // Clear results count
        const resultsCount = document.getElementById('searchResultsCount');
        if (resultsCount) {
            resultsCount.textContent = '';
        }
    }
}

function handleEmployeeSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const resultsCount = document.getElementById('searchResultsCount');
    const activeEmployeeTab = document.querySelector('.employee-tab-content.active').id;
    
    if (searchTerm === '') {
        loadTrucksByStatus(activeEmployeeTab);
        return;
    }
    
    const currentData = currentEmployeeTrucksData[activeEmployeeTab];
    if (!currentData || currentData.length === 0) {
        if (resultsCount) {
            resultsCount.textContent = 'No data to search';
        }
        return;
    }
    
    // Filter trucks based on search term
    let filteredTrucks = currentData.filter(truck => {
        return (
            (truck.truck_number && truck.truck_number.toLowerCase().includes(searchTerm)) ||
            (truck.driver_name && truck.driver_name.toLowerCase().includes(searchTerm)) ||
            (truck.driver_license && truck.driver_license.toLowerCase().includes(searchTerm)) ||
            (truck.driver_phone && truck.driver_phone.toLowerCase().includes(searchTerm)) ||
            (truck.truck_type && truck.truck_type.toLowerCase().includes(searchTerm)) ||
            (truck.truck_body && truck.truck_body.toLowerCase().includes(searchTerm)) ||
            (truck.truck_make && truck.truck_make.toLowerCase().includes(searchTerm)) ||
            (truck.truck_tons && truck.truck_tons.toLowerCase().includes(searchTerm)) ||
            (truck.previous_trucks && truck.previous_trucks.toLowerCase().includes(searchTerm))
        );
    });
    
    // ADD THIS: Maintain the display_order after filtering
    filteredTrucks.sort((a, b) => {
        // Handle null display_order values by treating them as very large numbers
        const orderA = a.display_order || 999999;
        const orderB = b.display_order || 999999;
        return orderA - orderB;
    });
    
    // Only apply additional filters if we're on All Drivers/Trucks tab
    if (activeEmployeeTab === 'all-trucks') {
        const activeFilterTypes = Object.keys(activeFilters).filter(key => activeFilters[key]);
        if (activeFilterTypes.length > 0) {
            // Check if both COMESA and C28 filters are active
            const bothFiltersActive = activeFilters.comesa && activeFilters.c28;
            
            if (bothFiltersActive) {
                // When both filters are active, require BOTH to be YES
                filteredTrucks = filteredTrucks.filter(truck => 
                    truck.comesa === 'YES' && truck.c28 === 'YES'
                );
            } else {
                // Normal behavior when only one or neither filter is active
                filteredTrucks = filteredTrucks.filter(truck => {
                    return activeFilterTypes.some(filterType => {
                        switch (filterType) {
                            case 'no_driver':
                                return truck.driver_name === 'NO DRIVER' || !truck.driver_name || truck.driver_name === '';
                            case 'comesa':
                                return truck.comesa === 'YES';
                            case 'c28':
                                return truck.c28 === 'YES';
                            default:
                                return false;
                        }
                    });
                });
            }
        }
    }
    
    const containerMap = {
        'all-trucks': 'trucks-list',
        'no-truck': 'no-truck-list',
        'left': 'left-list'
    };
    
    const containerId = containerMap[activeEmployeeTab];
    
    // Display with fresh numbering starting from 1
    displayTrucksInContainer(filteredTrucks, containerId);
    
    if (resultsCount) {
        resultsCount.textContent = `Found ${filteredTrucks.length} of ${currentData.length} items`;
    }
}
document.addEventListener('DOMContentLoaded', function() {
    // Initialize currentEmployeeTrucksData if not exists
    if (!window.currentEmployeeTrucksData) {
        window.currentEmployeeTrucksData = {
            'all-trucks': [],
            'no-truck': [],
            'left': []
        };
    }
    
    // Initialize active filters
    activeFilters = {
        no_driver: false,
        comesa: false,
        c28: false
    };
     setupModalBackButton();
    // Initialize filter UI
    updateFilterUI();
    
    // Set initial filter visibility
    const filterContainer = document.getElementById('filterContainer');
    if (filterContainer) {
        const allTrucksTab = document.getElementById('all-trucks');
        if (allTrucksTab && allTrucksTab.classList.contains('active')) {
            filterContainer.style.display = 'block';
        } else {
            filterContainer.style.display = 'none';
        }
    }

    // Load initial data
    displayLastUpdatedDate('truck-list');
    displayLastUpdatedDate('allowances');
    displayLastUpdatedDate('distance');
    displayLastUpdatedDate('diesel');
    updateEmployeeFilterVisibility(currentEmployeeTab);
    loadTrucks();
    loadAllowances();
    setupSearch();
    setupAllowanceSearch();
    
    console.log('Employee portal initialized with filters');
});

// Date formatting function
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Function to view license document from view details
function viewLicenseDocumentFromUrl(licenseUrl) {
    if (!licenseUrl) {
        alert('No license document available');
        return;
    }
    window.open(licenseUrl, '_blank');
}

// UPDATE THIS FUNCTION: Format previous trucks for details modal
function formatPreviousTrucksForDetails(previousTrucks) {
    if (!previousTrucks) {
        return '<div class="no-previous-trucks">No previous trucks</div>';
    }
    
    const trucksArray = previousTrucks.split(', ').filter(t => t.trim() !== '');
    
    if (trucksArray.length === 0) {
        return '<div class="no-previous-trucks">No previous trucks</div>';
    }
    
    return trucksArray.map((truckNum, index) => 
        `<div class="previous-truck-item">${index + 1}. ${truckNum}</div>`
    ).join('');
}

// Add this to your rearrange modal save function
async function refreshEmployeeView() {
    console.log('Refreshing employee view with new order');
    
    // Get current active employee tab
    const activeEmployeeTab = document.querySelector('.employee-tab-content.active')?.id || 'all-trucks';
    
    // Reload all employee sections
    await loadTrucksByStatus('all-trucks');
    await loadTrucksByStatus('no-truck');
    await loadTrucksByStatus('left');
    
    // Re-activate the current tab
    const currentTabElement = document.querySelector(`[onclick="openEmployeeTab('${activeEmployeeTab}')"]`);
    if (currentTabElement) {
        currentTabElement.click();
    }
    
    console.log('Employee view refreshed with new order');
}


// Add this to your global functions section
let currentModalOpen = false;
let currentModalElement = null;

// Setup modal back button functionality
function setupModalBackButton() {
    // Listen for browser back button
    window.addEventListener('popstate', function(event) {
        if (currentModalOpen && currentModalElement) {
            closeCurrentModal();
        }
    });
}
// Update modal creation to track current modal
function trackModalCreation(modalElement) {
    // Reset all modal scroll positions first
    resetModalScroll();
    
    currentModalOpen = true;
    currentModalElement = modalElement;
    
   
    
    // Push state to history for back button functionality
    history.pushState({ modalOpen: true }, '', '');
}
// Close current modal and clean up
function closeCurrentModal() {
    if (currentModalElement) {
        // Remove any modal wrapper first
        const modalWrapper = currentModalElement.querySelector('.modal-wrapper');
        if (modalWrapper) {
            modalWrapper.remove();
        }
        
        currentModalElement.remove();
        currentModalOpen = false;
        currentModalElement = null;
        
        // Restore body overflow
        document.body.style.overflow = '';
        
     
        
        // Only go back if we're in a modal state
        if (history.state && history.state.modalOpen) {
            history.back();
        }
    }
}
function resetModalScroll() {
    // ONLY reset scroll for existing modals, not the window
    const existingModals = document.querySelectorAll('.modal');
    existingModals.forEach(modal => {
        // Reset modal wrapper
        const modalWrappers = modal.querySelectorAll('.modal-wrapper');
        modalWrappers.forEach(wrapper => {
            wrapper.scrollTop = 0;
        });
        
        // Reset modal scroll containers
        const scrollContainers = modal.querySelectorAll('.modal-scroll-container, .modal-content, .details-grid');
        scrollContainers.forEach(container => {
            container.scrollTop = 0;
        });
    });
    
    // Also reset the fixed detailsModal if it exists
    const fixedModal = document.getElementById('detailsModal');
    if (fixedModal) {
        fixedModal.scrollTop = 0;
        const modalContent = fixedModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }
    
    
}