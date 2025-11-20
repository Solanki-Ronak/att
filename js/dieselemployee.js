// Global variables for diesel data
let allDieselData = [];
let currentDieselId = null;

// Initialize diesel tab
function initializeDieselTab() {
    setupDieselSearch();
    loadDieselData();
    setupDieselModal();
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
        const { data: dieselData, error } = await supabase
            .from('diesel_data')
            .select('*')
            .order('source')
            .order('destination');

        if (error) throw error;

        allDieselData = dieselData || [];

        if (!dieselData || dieselData.length === 0) {
            dieselList.innerHTML = '<div class="error">No diesel data found in the database.</div>';
            return;
        }

        displayDieselData(dieselData);
        const resultsCount = document.getElementById('dieselSearchResultsCount');
        if (resultsCount) {
            resultsCount.textContent = `Showing all ${dieselData.length} records`;
        }
    } catch (error) {
        console.error('Error loading diesel data:', error);
        dieselList.innerHTML = '<div class="error">Error loading diesel data: ' + error.message + '</div>';
    }
}
// Display diesel data in table format
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
                    <th style="width: 80px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    dieselData.forEach(item => {
        tableHTML += `
            <tr>
                <td>${item.source}</td>
                <td>${item.destination}</td>
                <td>${item.load}</td>
                <td>
                    <div class="diesel-actions">
                        <button class="btn btn-view" onclick="openDieselDetailsModal('${item.id}')">View</button>
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
// Setup diesel modal
function setupDieselModal() {
    const modal = document.getElementById('dieselDetailsModal');
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Close diesel details modal
function closeDieselDetailsModal() {
    document.getElementById('dieselDetailsModal').style.display = 'none';
}

// Open diesel details modal
async function openDieselDetailsModal(dieselId) {
    currentDieselId = dieselId;
    const modal = document.getElementById('dieselDetailsModal');
    
    try {
        const { data: dieselItem, error } = await supabase
            .from('diesel_data')
            .select('*')
            .eq('id', dieselId)
            .single();

        if (error) throw error;

        // Generate the modal content
        const modalContent = generateDieselModalContent(dieselItem);
        document.getElementById('dieselModalContent').innerHTML = modalContent;
        
        modal.style.display = 'block';
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
// Update the openTab function to initialize diesel tab
// Add this to your existing openTab function:
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
        initializeDieselTab(); // Initialize diesel tab
    } else if (tabName === 'truck-list') {
        restoreActiveAdminSubTab();
    }
    
    // Display last updated date for the active tab
    displayLastUpdatedDate(tabName);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add diesel initialization to your existing DOMContentLoaded function
    setupDieselModal();
});