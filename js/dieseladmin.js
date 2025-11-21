// Global variables for diesel data
let allDieselData = [];
let currentDieselId = null;
let currentEditingId = null;

// Initialize diesel tab for admin
function initializeDieselTab() {
    setupDieselSearch();
    loadDieselData();
    setupDieselModals();
}

// Setup diesel search functionality
function setupDieselSearch() {
    const searchInput = document.getElementById('dieselSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleDieselSearch);
    }
}

// Handle diesel search
function handleDieselSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const resultsCount = document.getElementById('dieselSearchResultsCount');
    
    if (searchTerm === '') {
        displayDieselData(allDieselData);
        if (resultsCount) {
            resultsCount.textContent = `Showing all ${allDieselData.length} records`;
        }
        return;
    }
    
    const filteredData = allDieselData.filter(item => {
        return (
            (item.source && item.source.toLowerCase().includes(searchTerm)) ||
            (item.destination && item.destination.toLowerCase().includes(searchTerm)) ||
            (item.load && item.load.toLowerCase().includes(searchTerm))
        );
    });
    
    displayDieselData(filteredData);
    if (resultsCount) {
        resultsCount.textContent = `Found ${filteredData.length} of ${allDieselData.length} records`;
    }
}

// Load diesel data from database
async function loadDieselData() {
    const dieselList = document.getElementById('diesel-list');
    
    try {
        dieselList.innerHTML = '<div class="loading">Loading diesel data...</div>';

        const { data: dieselData, error } = await supabase
            .from('diesel_data')
            .select('*')
            .order('source')
            .order('destination');

        if (error) throw error;

        allDieselData = dieselData || [];

        if (!dieselData || dieselData.length === 0) {
            dieselList.innerHTML = '<div class="no-results">No diesel data found. Click "Add New Diesel Data" to create records.</div>';
            return;
        }

        displayDieselData(dieselData);
        const resultsCount = document.getElementById('dieselSearchResultsCount');
        if (resultsCount) {
            resultsCount.textContent = `Showing all ${dieselData.length} records`;
        }
        
        updateLastUpdatedDate('diesel');
    } catch (error) {
        console.error('Error loading diesel data:', error);
        dieselList.innerHTML = '<div class="error">Error loading diesel data: ' + error.message + '</div>';
    }
}
function displayDieselData(dieselData) {
    const dieselList = document.getElementById('diesel-list');
    
    if (dieselData.length === 0) {
        dieselList.innerHTML = '<div class="no-results">No diesel data found matching your search.</div>';
        return;
    }

    let tableHTML = `
        <table class="diesel-table">
            <thead>
                <tr>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Load</th>
                    <th style="width: 160px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    dieselData.forEach(item => {
        tableHTML += `
            <tr>
                <td>${item.source || ''}</td>
                <td>${item.destination || ''}</td>
                <td>${item.load || ''}</td>
                <td>
                    <div class="diesel-actions">
                        <button class="btn btn-view" onclick="openDieselDetailsModal('${item.id}')">View</button>
                        <button class="btn btn-edit" onclick="openEditDieselModal('${item.id}')">Edit</button>
                        <button class="btn btn-delete" onclick="confirmDeleteDiesel('${item.id}', '${item.source}', '${item.destination}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    dieselList.innerHTML = tableHTML;
}
// Setup diesel modals
function setupDieselModals() {
    const modals = ['dieselDetailsModal', 'editDieselModal', 'addDieselModal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    modal.style.display = 'none';
                };
            }
        }
    });
    
    window.onclick = (event) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };
}

// Close diesel details modal
function closeDieselDetailsModal() {
    const modal = document.getElementById('dieselDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Open diesel details modal
async function openDieselDetailsModal(dieselId) {
    currentDieselId = dieselId;
    const modal = document.getElementById('dieselDetailsModal');
    
    if (!modal) {
        console.error('Diesel details modal not found');
        showErrorModal('Diesel details modal not available.');
        return;
    }
    
    try {
        const { data: dieselItem, error } = await supabase
            .from('diesel_data')
            .select('*')
            .eq('id', dieselId)
            .single();

        if (error) throw error;

        const modalContent = generateDieselModalContent(dieselItem);
        const modalContentElement = document.getElementById('dieselModalContent');
        
        if (modalContentElement) {
            modalContentElement.innerHTML = modalContent;
            modal.style.display = 'block';
        } else {
            throw new Error('Modal content element not found');
        }
    } catch (error) {
        console.error('Error loading diesel details:', error);
        showErrorModal('Error loading diesel details: ' + error.message);
    }
}
// Generate diesel modal content for view - SHOWS ALL TRUCK TYPES EVEN IF EMPTY
function generateDieselModalContent(dieselItem) {
    const mainHeading = `${dieselItem.source} TO ${dieselItem.destination}`;
    const subHeading = `${dieselItem.load}`;
    
    const truckTypes = [
        { key: 'km', label: 'KM', value: dieselItem.km, comment: dieselItem.km_comment },
        { key: 'p360', label: 'P360', value: dieselItem.p360, comment: dieselItem.p360_comment },
        { key: 'howo', label: 'HOWO', value: dieselItem.howo, comment: dieselItem.howo_comment },
        { key: 'truck_114', label: '114', value: dieselItem.truck_114, comment: dieselItem.truck_114_comment },
        { key: 'shacman_pulling', label: 'SHACMAN-PULLING', value: dieselItem.shacman_pulling, comment: dieselItem.shacman_pulling_comment },
        { key: 'truck_113', label: '113', value: dieselItem.truck_113, comment: dieselItem.truck_113_comment },
        { key: 'semi_scania', label: 'SEMI-SCANIA', value: dieselItem.semi_scania, comment: dieselItem.semi_scania_comment },
        { key: 'semi_shacman_container', label: 'SEMI-SHACMAN (CONTAINER)', value: dieselItem.semi_shacman_container, comment: dieselItem.semi_shacman_container_comment },
        { key: 'semi_shacman_flatbed', label: 'SEMI-SHACMAN (FLAT-BED)', value: dieselItem.semi_shacman_flatbed, comment: dieselItem.semi_shacman_flatbed_comment },
        { key: 'semi_howo_container', label: 'SEMI-HOWO (CONTAINER)', value: dieselItem.semi_howo_container, comment: dieselItem.semi_howo_container_comment },
        { key: 'semi_howo_flatbed', label: 'SEMI-HOWO (FLAT-BED/HALF BODY)', value: dieselItem.semi_howo_flatbed, comment: dieselItem.semi_howo_flatbed_comment }
    ];

    let truckRowsHTML = '';
    truckTypes.forEach(truck => {
        // ALWAYS show the row, even if value is null/empty
        const displayValue = truck.value !== null && truck.value !== '' ? truck.value : '---';
        const displayComment = truck.comment || '---';
        
        truckRowsHTML += `
            <tr>
                <td class="truck-type-label">${truck.label}</td>
                <td class="truck-value">${displayValue}</td>
                <td class="truck-comment">${displayComment}</td>
            </tr>
        `;
    });

    return `
        <div class="diesel-modal-header">
            <h3 class="diesel-sub-heading1">${mainHeading}</h3>
            <h3 class="diesel-sub-heading2">${subHeading}</h3>
        </div>
        
        <div class="diesel-details-table-container">
            <table class="diesel-details-table">
                <thead>
                    <tr>
                        <th>Truck Type</th>
                        <th>Value</th>
                        <th>Comments</th>
                    </tr>
                </thead>
                <tbody>
                    ${truckRowsHTML}
                </tbody>
            </table>
        </div>
    `;
}
// Open Add Diesel Modal
function openAddDieselModal() {
    currentEditingId = null;
    const modal = document.getElementById('addDieselModal');
    
    document.getElementById('addDieselForm').reset();
    
    const emptyDieselItem = {
        p360: '', p360_comment: '', howo: '', howo_comment: '',
        truck_114: '', truck_114_comment: '', shacman_pulling: '', shacman_pulling_comment: '',
        truck_113: '', truck_113_comment: '', semi_scania: '', semi_scania_comment: '',
        semi_shacman_container: '', semi_shacman_container_comment: '', semi_shacman_flatbed: '', semi_shacman_flatbed_comment: '',
        semi_howo_container: '', semi_howo_container_comment: '', semi_howo_flatbed: '', semi_howo_flatbed_comment: ''
    };
    
    populateTruckFields('add', emptyDieselItem);
    modal.style.display = 'block';
}

// Open Edit Diesel Modal - SIMPLIFIED AND WORKING VERSION
async function openEditDieselModal(dieselId) {
    currentEditingId = dieselId;
    const modal = document.getElementById('editDieselModal');
    
    try {
        const { data: dieselItem, error } = await supabase
            .from('diesel_data')
            .select('*')
            .eq('id', dieselId)
            .single();

        if (error) throw error;

        console.log('Editing diesel item:', dieselItem);

        // Reset form first
        document.getElementById('editDieselForm').reset();
        
        // Show modal
        modal.style.display = 'block';
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Direct assignment - this should work
            const editSource1 = document.getElementById('editSource1');
            const editDestination1 = document.getElementById('editDestination1');
            const editLoad = document.getElementById('editLoad');
            
            if (editSource1) editSource1.value = dieselItem.source || '';
            if (editDestination1) editDestination1.value = dieselItem.destination || '';
            if (editLoad) editLoad.value = dieselItem.load || '';
            
            document.getElementById('editKm').value = dieselItem.km || '';
            document.getElementById('editKmComment').value = dieselItem.km_comment || '';
            
            populateTruckFields('edit', dieselItem);
            
            console.log('Fields populated:', {
                source: editSource1?.value,
                destination: editDestination1?.value,
                load: editLoad?.value
            });
        }, 100);
        
    } catch (error) {
        console.error('Error loading diesel data for edit:', error);
        showErrorModal('Error loading diesel data: ' + error.message);
    }
}
// Populate truck fields - ENHANCED VERSION
function populateTruckFields(formType, dieselItem) {
    const containerId = formType === 'edit' ? 'editTruckFieldsContainer' : 'addTruckFieldsContainer';
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }
    
    container.innerHTML = '';
    
    const truckTypes = [
        { key: 'p360', label: 'P360', value: dieselItem.p360, comment: dieselItem.p360_comment },
        { key: 'howo', label: 'HOWO', value: dieselItem.howo, comment: dieselItem.howo_comment },
        { key: 'truck_114', label: '114', value: dieselItem.truck_114, comment: dieselItem.truck_114_comment },
        { key: 'shacman_pulling', label: 'SHACMAN-PULLING', value: dieselItem.shacman_pulling, comment: dieselItem.shacman_pulling_comment },
        { key: 'truck_113', label: '113', value: dieselItem.truck_113, comment: dieselItem.truck_113_comment },
        { key: 'semi_scania', label: 'SEMI-SCANIA', value: dieselItem.semi_scania, comment: dieselItem.semi_scania_comment },
        { key: 'semi_shacman_container', label: 'SEMI-SHACMAN (CONTAINER)', value: dieselItem.semi_shacman_container, comment: dieselItem.semi_shacman_container_comment },
        { key: 'semi_shacman_flatbed', label: 'SEMI-SHACMAN (FLAT-BED)', value: dieselItem.semi_shacman_flatbed, comment: dieselItem.semi_shacman_flatbed_comment },
        { key: 'semi_howo_container', label: 'SEMI-HOWO (CONTAINER)', value: dieselItem.semi_howo_container, comment: dieselItem.semi_howo_container_comment },
        { key: 'semi_howo_flatbed', label: 'SEMI-HOWO (FLAT-BED/HALF BODY)', value: dieselItem.semi_howo_flatbed, comment: dieselItem.semi_howo_flatbed_comment }
    ];
    
    truckTypes.forEach(truck => {
        const fieldHTML = `
            <div class="truck-field-group form-row">
                <div class="form-group">
                    <label>${truck.label}:</label>
                    <input type="number" id="${formType}${truck.key}" value="${truck.value || ''}" placeholder="Value" step="1">
                </div>
                <div class="form-group">
                    <label>${truck.label} Comment:</label>
                    <input type="text" id="${formType}${truck.key}_comment" value="${truck.comment || ''}" placeholder="Comment">
                </div>
            </div>
        `;
        container.innerHTML += fieldHTML;
    });
    
    console.log(`Populated ${truckTypes.length} truck fields for ${formType} form`);
}
// Form submission handlers
document.getElementById('addDieselForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    await saveDieselData('add');
});

document.getElementById('editDieselForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    await saveDieselData('edit');
});
// Save diesel data - CORRECTED VERSION
async function saveDieselData(action) {
    const formId = action === 'add' ? 'addDieselForm' : 'editDieselForm';
    const form = document.getElementById(formId);
    
    if (!form) {
        console.error('Form not found:', formId);
        return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = action === 'add' ? '➕ Adding...' : '💾 Saving...';
        
        // CORRECTED: Use the actual field IDs from your HTML
        let source, destination, load;
        
        if (action === 'add') {
            source = document.getElementById('addSource1')?.value.trim(); // Changed to addSource1
            destination = document.getElementById('addDestination1')?.value.trim(); // Changed to addDestination1
            load = document.getElementById('addLoad')?.value.trim();
        } else {
            source = document.getElementById('editSource1')?.value.trim();
            destination = document.getElementById('editDestination1')?.value.trim();
            load = document.getElementById('editLoad')?.value.trim();
        }
        
        console.log('Form values:', { source, destination, load, action }); // Debug log
        
        if (!source || !destination || !load) {
            throw new Error('Source, Destination, and Load are required fields');
        }
        
        const formData = {
            source: source,
            destination: destination,
            load: load,
            km: parseInt(document.getElementById(action + 'Km')?.value) || null,
            km_comment: document.getElementById(action + 'KmComment')?.value.trim() || null,
            p360: parseInt(document.getElementById(action + 'p360')?.value) || null,
            p360_comment: document.getElementById(action + 'p360_comment')?.value.trim() || null,
            howo: parseInt(document.getElementById(action + 'howo')?.value) || null,
            howo_comment: document.getElementById(action + 'howo_comment')?.value.trim() || null,
            truck_114: parseInt(document.getElementById(action + 'truck_114')?.value) || null,
            truck_114_comment: document.getElementById(action + 'truck_114_comment')?.value.trim() || null,
            shacman_pulling: parseInt(document.getElementById(action + 'shacman_pulling')?.value) || null,
            shacman_pulling_comment: document.getElementById(action + 'shacman_pulling_comment')?.value.trim() || null,
            truck_113: parseInt(document.getElementById(action + 'truck_113')?.value) || null,
            truck_113_comment: document.getElementById(action + 'truck_113_comment')?.value.trim() || null,
            semi_scania: parseInt(document.getElementById(action + 'semi_scania')?.value) || null,
            semi_scania_comment: document.getElementById(action + 'semi_scania_comment')?.value.trim() || null,
            semi_shacman_container: parseInt(document.getElementById(action + 'semi_shacman_container')?.value) || null,
            semi_shacman_container_comment: document.getElementById(action + 'semi_shacman_container_comment')?.value.trim() || null,
            semi_shacman_flatbed: parseInt(document.getElementById(action + 'semi_shacman_flatbed')?.value) || null,
            semi_shacman_flatbed_comment: document.getElementById(action + 'semi_shacman_flatbed_comment')?.value.trim() || null,
            semi_howo_container: parseInt(document.getElementById(action + 'semi_howo_container')?.value) || null,
            semi_howo_container_comment: document.getElementById(action + 'semi_howo_container_comment')?.value.trim() || null,
            semi_howo_flatbed: parseInt(document.getElementById(action + 'semi_howo_flatbed')?.value) || null,
            semi_howo_flatbed_comment: document.getElementById(action + 'semi_howo_flatbed_comment')?.value.trim() || null
        };
        
        console.log('Form data to save:', formData); // Debug log
        
        let result;
        if (action === 'add') {
            result = await supabase.from('diesel_data').insert([formData]).select();
        } else {
            result = await supabase.from('diesel_data').update(formData).eq('id', currentEditingId).select();
        }
        
        if (result.error) throw result.error;
        
        document.getElementById(action === 'add' ? 'addDieselModal' : 'editDieselModal').style.display = 'none';
        await loadDieselData();
        
        showSuccessModal(action === 'add' ? 'Diesel data added successfully!' : 'Diesel data updated successfully!');
        
    } catch (error) {
        console.error('Error saving diesel data:', error);
        showErrorModal('Error saving diesel data: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = action === 'add' ? '➕ Add Diesel Data' : '💾 Save Changes';
    }
}

// Utility functions
function showSuccessModal(message) {
    const modal = document.getElementById('successModal');
    document.getElementById('successMessage').textContent = message;
    modal.style.display = 'block';
}

function showErrorModal(message) {
    const modal = document.getElementById('errorModal');
    document.getElementById('errorMessage').textContent = message;
    modal.style.display = 'block';
}

function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
}

function closeErrorModal() {
    document.getElementById('errorModal').style.display = 'none';
}

function updateLastUpdatedDate(tabName) {
    const now = new Date();
    const formattedDate = now.toLocaleString();
    const container = document.getElementById(`last-updated-${tabName}`);
    
    if (container) {
        container.innerHTML = `<div class="last-updated">Last updated: ${formattedDate}</div>`;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupDieselModals();
});

// Delete Diesel Functions
function confirmDeleteDiesel(dieselId, source, destination) {
    currentDieselId = dieselId;
    
    const modal = document.getElementById('deleteConfirmModal');
    const message = document.getElementById('deleteConfirmMessage');
    
    message.innerHTML = `
        <strong>🚨 WARNING: This action cannot be undone!</strong><br><br>
        Are you sure you want to permanently delete this diesel data?<br>
        <strong>Route:</strong> ${source} to ${destination}<br><br>
        This will remove all associated data from the database.
    `;
    
    // Update the confirm button to call delete diesel function
    const confirmBtn = document.getElementById('deleteConfirmYes');
    confirmBtn.onclick = handleDeleteDiesel;
    
    modal.style.display = 'block';
}

async function handleDeleteDiesel() {
    if (!currentDieselId) return;
    
    const submitBtn = document.getElementById('deleteConfirmYes');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Deleting...';
    submitBtn.disabled = true;
    
    try {
        const { error } = await supabase
            .from('diesel_data')
            .delete()
            .eq('id', currentDieselId);
        
        if (error) throw error;
        
        showSuccessModal('Diesel data deleted successfully!');
        document.getElementById('deleteConfirmModal').style.display = 'none';
        
        // Update last updated date and reload data
        await updateLastUpdatedDate('diesel');
        loadDieselData();
        
    } catch (error) {
        console.error('Error deleting diesel data:', error);
        showErrorModal('Error deleting diesel data: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        currentDieselId = null;
        
        // Reset the confirm button back to truck deletion
        const confirmBtn = document.getElementById('deleteConfirmYes');
        confirmBtn.onclick = handleDeleteTruck;
    }
}