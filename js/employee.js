let allTrucks = []; // Store all trucks for filtering
let allAllowances = [];




// Diesel Data Management
let currentDieselType = 'long_haul';
let currentLevel = 'categories';
let currentCategoryId = null;
let currentRouteId = null;
let dieselNavigationStack = [];



function initializeDieselTab() {
    if (document.getElementById('diesel').classList.contains('active')) {
        // Always start with main tabs when opening diesel tab
        showMainTabs();
    }
}
function openDieselType(type) {
    currentDieselType = type;
    
    // Update active tab
    document.querySelectorAll('.diesel-main-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Hide main tabs and show back button
    document.querySelector('.diesel-main-tabs').style.display = 'none';
    document.getElementById('dieselBackButton').style.display = 'block';
    
    if (type === 'long_haul') {
        loadDieselCategories();
    } else {
        showComingSoon();
    }
}

// Show coming soon message
function showComingSoon() {
    hideAllDieselSections();
    document.getElementById('dieselComingSoon').style.display = 'block';
    document.getElementById('dieselLevelNav').style.display = 'none';
    document.getElementById('dieselAddButton').style.display = 'none';
}

async function loadDieselCategories() {
    const container = document.getElementById('dieselCategories');
    container.innerHTML = '<div class="loading">Loading categories...</div>';
    
    try {
        const { data: categories, error } = await supabase
            .from('diesel_categories')
            .select('*')
            .eq('type', currentDieselType)
            .order('name');
        
        if (error) throw error;
        
        displayDieselCategories(categories);
        
        // ADD THIS LINE for categories level
        setupDieselNavigation('Categories', []);
        
    } catch (error) {
        console.error('Error loading diesel categories:', error);
        container.innerHTML = '<div class="error">Error loading categories</div>';
    }
}

// Display diesel categories
function displayDieselCategories(categories) {
    const container = document.getElementById('dieselCategories');
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="no-results">No categories found</div>';
        return;
    }
    
    let html = '';
    categories.forEach(category => {
        html += `
            <div class="diesel-level-card" onclick="openDieselRoutes('${category.id}', '${category.name}')">
                <h3>${category.name}</h3>
                <p>Click to view routes</p>
                ${window.location.pathname.includes('admin') ? `
                <div class="diesel-admin-actions">
                    <button class="diesel-admin-btn diesel-edit-btn" onclick="event.stopPropagation(); editDieselCategory('${category.id}')">✏️ Edit</button>
                    <button class="diesel-admin-btn diesel-delete-btn" onclick="event.stopPropagation(); deleteDieselCategory('${category.id}')">🗑️ Delete</button>
                </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
    showDieselSection('categories');
    
    // Show add button for admin
    if (window.location.pathname.includes('admin')) {
        document.getElementById('dieselAddButton').innerHTML = `
            <button class="diesel-add-btn" onclick="openAddDieselCategoryModal()">
                ➕ Add New Category
            </button>
        `;
        document.getElementById('dieselAddButton').style.display = 'block';
    }
}

async function openDieselRoutes(categoryId, categoryName) {
    currentCategoryId = categoryId;
    const container = document.getElementById('dieselRoutes');
    container.innerHTML = '<div class="loading">Loading routes...</div>';
    
    try {
        const { data: routes, error } = await supabase
            .from('diesel_routes')
            .select('*')
            .eq('category_id', categoryId)
            .order('route_name');
        
        if (error) throw error;
        
        displayDieselRoutes(routes, categoryName);
        
        // KEEP THIS LINE - It should already be here
        setupDieselNavigation('Routes', [
            { type: 'category', id: categoryId, name: categoryName }
        ]);
        
    } catch (error) {
        console.error('Error loading diesel routes:', error);
        container.innerHTML = '<div class="error">Error loading routes</div>';
    }
}

// Display diesel routes
function displayDieselRoutes(routes, categoryName) {
    const container = document.getElementById('dieselRoutes');
    
    if (routes.length === 0) {
        container.innerHTML = '<div class="no-results">No routes found</div>';
        return;
    }
    
    let html = '';
    routes.forEach(route => {
        html += `
            <div class="diesel-level-card" onclick="openDieselTruckData('${route.id}', '${route.route_name}')">
                <h3>${route.route_name}</h3>
                <p>Category: ${categoryName}</p>
                ${window.location.pathname.includes('admin') ? `
                <div class="diesel-admin-actions">
                    <button class="diesel-admin-btn diesel-edit-btn" onclick="event.stopPropagation(); editDieselRoute('${route.id}')">✏️ Edit</button>
                    <button class="diesel-admin-btn diesel-delete-btn" onclick="event.stopPropagation(); deleteDieselRoute('${route.id}')">🗑️ Delete</button>
                </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
    showDieselSection('routes');
    
    // Show add button for admin
    if (window.location.pathname.includes('admin')) {
        document.getElementById('dieselAddButton').innerHTML = `
            <button class="diesel-add-btn" onclick="openAddDieselRouteModal()">
                ➕ Add New Route
            </button>
        `;
    }
}

async function openDieselTruckData(routeId, routeName) {
    currentRouteId = routeId;
    
    try {
        const { data: truckData, error } = await supabase
            .from('diesel_truck_data')
            .select('*')
            .eq('route_id', routeId)
            .order('truck_type');
        
        if (error) throw error;
        
        // Get category name for breadcrumb
        const { data: route } = await supabase
            .from('diesel_routes')
            .select('diesel_categories(name)')
            .eq('id', routeId)
            .single();
        
        displayDieselTruckData(truckData, routeName, route.diesel_categories.name);
        
        // KEEP THIS LINE - It should already be here  
        setupDieselNavigation('Truck Data', [
            { type: 'category', id: currentCategoryId, name: route.diesel_categories.name },
            { type: 'route', id: routeId, name: routeName }
        ]);
        
    } catch (error) {
        console.error('Error loading truck data:', error);
        document.getElementById('dieselTruckData').innerHTML = '<div class="error">Error loading truck data</div>';
    }
}

// Display diesel truck data in vertical format
function displayDieselTruckData(truckData, routeName, categoryName) {
    const container = document.getElementById('dieselTruckData');
    
    if (truckData.length === 0) {
        container.innerHTML = `
            <div class="diesel-data-header">
                <h3>${categoryName}</h3>
                <h4>${routeName}</h4>
            </div>
            <div class="diesel-no-data">
                <h4>No truck data found</h4>
                <p>No diesel data has been added for this route yet.</p>
            </div>
        `;
        showDieselSection('truckData');
        return;
    }
    
// Replace this part in displayDieselTruckData function:
let html = `
    <div class="diesel-data-header">
        <h3>${categoryName}</h3>
        <h4>${routeName}</h4>
    </div>
    <div class="diesel-truck-cards">
`;
    
  truckData.forEach(truck => {
    html += `
        <div class="diesel-truck-card">
            <div class="diesel-truck-card-body">
                <table class="diesel-vertical-table">
                    <tr>
                        <th>TRUCK TYPE</th>
                        <th>DIESEL</th>
                    </tr>
                    <tr>
                        <td>113:</td>
                        <td>${truck.distance_113 || '-'}</td>
                    </tr>
                    <tr>
                        <td>114:</td>
                        <td>${truck.distance_114 || '-'}</td>
                    </tr>
                    <tr>
                        <td>P360:</td>
                        <td>${truck.p360 || '-'}</td>
                    </tr>
                    <tr>
                        <td>Shacman:</td>
                        <td>${truck.shacman || '-'}</td>
                    </tr>
                    <tr>
                        <td>Howo (Old):</td>
                        <td>${truck.howo_old || '-'}</td>
                    </tr>
                    <tr>
                        <td>Howo (New):</td>
                        <td>${truck.howo_new || '-'}</td>
                    </tr>
                    <tr>
                        <td>Semi Scania (Body):</td>
                        <td>${truck.semi_scania_body || '-'}</td>
                    </tr>
                    <tr>
                        <td>Semi Scania (Flat Bed):</td>
                        <td>${truck.semi_scania_flat_bed || '-'}</td>
                    </tr>
                    <tr>
                        <td>Semi Howo (Body):</td>
                        <td>${truck.semi_howo_body || '-'}</td>
                    </tr>
                    <tr>
                        <td>Semi Howo (Flat Bed):</td>
                        <td>${truck.semi_howo_flat_bed || '-'}</td>
                    </tr>
                    <tr>
                        <td>Semi Shacman (Body):</td>
                        <td>${truck.semi_shacman_body || '-'}</td>
                    </tr>
                    <tr>
                        <td>Semi Shacman (Flat Bed):</td>
                        <td>${truck.semi_shacman_flat_bed || '-'}</td>
                    </tr>
                </table>
            </div>
            ${window.location.pathname.includes('admin') ? `
            <div class="diesel-truck-admin-actions">
                <button class="diesel-admin-btn diesel-edit-btn" onclick="editDieselTruckData('${truck.id}')">✏️ Edit</button>
                <button class="diesel-admin-btn diesel-delete-btn" onclick="deleteDieselTruckData('${truck.id}')">🗑️ Delete</button>
            </div>
            ` : ''}
        </div>
    `;
});
    html += `</div>`;
    
    container.innerHTML = html;
    showDieselSection('truckData');
    
    // Show add button for admin
    if (window.location.pathname.includes('admin')) {
        document.getElementById('dieselAddButton').innerHTML = `
            <button class="diesel-add-btn" onclick="openAddDieselTruckDataModal()">
                ➕ Add New Truck Data
            </button>
        `;
    }
}




function resetDieselNavigation() {
    dieselNavigationStack = [];
    const backButton = document.getElementById('dieselBackButton');
    if (backButton) {
        backButton.style.display = 'none';
    }
    
    // Show main tabs when resetting
    const mainTabs = document.querySelector('.diesel-main-tabs');
    if (mainTabs) {
        mainTabs.style.display = 'flex';
    }
    
    // Hide add button for employee
    if (!window.location.pathname.includes('admin')) {
        document.getElementById('dieselAddButton').style.display = 'none';
    }
}

function goBackDieselLevel() {
    if (dieselNavigationStack.breadcrumbs.length === 0) {
        // Going back to main tabs
        showMainTabs();
    } else {
        const lastCrumb = dieselNavigationStack.breadcrumbs[dieselNavigationStack.breadcrumbs.length - 1];
        
        if (lastCrumb.type === 'category') {
            // Going back to categories from routes
            showDieselSection('categories');
            loadDieselCategories();
        } else if (lastCrumb.type === 'route') {
            // Going back to routes from truck data
            const categoryCrumb = dieselNavigationStack.breadcrumbs.find(crumb => crumb.type === 'category');
            if (categoryCrumb) {
                showDieselSection('routes');
                openDieselRoutes(categoryCrumb.id, categoryCrumb.name);
            }
        }
    }
    
    // Update navigation stack by removing current level
    if (dieselNavigationStack.breadcrumbs.length > 0) {
        dieselNavigationStack.breadcrumbs.pop();
    }
}

function showMainTabs() {
    // Hide all sections and show main tabs
    hideAllDieselSections();
    document.getElementById('dieselComingSoon').style.display = 'none';
    document.getElementById('dieselBackButton').style.display = 'none';
    document.querySelector('.diesel-main-tabs').style.display = 'flex';
    
    // Hide add button for employee
    if (!window.location.pathname.includes('admin')) {
        document.getElementById('dieselAddButton').style.display = 'none';
    }
    
    // Reset navigation state
    currentCategoryId = null;
    currentRouteId = null;
    dieselNavigationStack = [];
}
function resetDieselNavigation() {
    dieselNavigationStack = [];
    showMainTabs();
}
function hideAllDieselSections() {
    document.getElementById('dieselCategories').style.display = 'none';
    document.getElementById('dieselRoutes').style.display = 'none';
    document.getElementById('dieselTruckData').style.display = 'none';
    document.getElementById('dieselComingSoon').style.display = 'none';
}

function setupDieselNavigation(currentLevel, breadcrumbs) {
    const backButton = document.getElementById('dieselBackButton');
    if (!backButton) return;
    
    // Always show back button when not at main level
    backButton.style.display = 'block';
    
    dieselNavigationStack = {
        currentLevel: currentLevel,
        breadcrumbs: breadcrumbs
    };
}

function showDieselSection(section) {
    hideAllDieselSections();
    const element = document.getElementById(`diesel${section.charAt(0).toUpperCase() + section.slice(1)}`);
    if (element) {
        element.style.display = section === 'truckData' ? 'block' : 'grid';
    }
}

// Admin CRUD functions (for admin.js only)
// These would be similar to your existing truck/allowance modals
// I'll provide the structure - you can implement the actual modals similarly

function openAddDieselCategoryModal() {
    // Similar to your existing modal functions
    console.log('Open add category modal');
}

function editDieselCategory(categoryId) {
    console.log('Edit category:', categoryId);
}

function deleteDieselCategory(categoryId) {
    if (confirm('Are you sure you want to delete this category? All associated routes and truck data will also be deleted.')) {
        // Delete implementation
    }
}

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
        
        // Prepare contacts text for copying
        const contactsText = getContactsTextFromTruck(truck);
        
        card.innerHTML = `
            <div class="card-number">${index + 1}</div>
            ${imageHtml}
            
            <div class="truck-number no-assigned-truck">NO ASSIGNED TRUCK</div>
            
            <div class="driver-info">
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${truck.driver_name}</span>
                    <div class="copy-call-buttons">
                        <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_name}')">📋</button>
                    </div>
                </div>
                
                <div class="info-row">
                    <span class="info-label">License:</span>
                    <span class="info-value">${truck.driver_license}</span>
                    <div class="copy-call-buttons">
                        <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_license}')">📋</button>
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
                <button class="btn btn-copy" onclick="copyTruckDetails('NO ASSIGNED TRUCK', '${truck.driver_name}', '${truck.driver_license}', '${contactsText.replace(/'/g, "\\'")}')">
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
        
        // Prepare contacts text for copying
        const contactsText = getContactsTextFromTruck(truck);
        
        card.innerHTML = `
            <div class="card-number">${index + 1}</div>
            ${imageHtml}
            
            <div class="truck-number left-company">LEFT COMPANY</div>
            
            <div class="driver-info">
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${truck.driver_name}</span>
                    <div class="copy-call-buttons">
                        <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_name}')">📋</button>
                    </div>
                </div>
                
                <div class="info-row">
                    <span class="info-label">License:</span>
                    <span class="info-value">${truck.driver_license}</span>
                    <div class="copy-call-buttons">
                        <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_license}')">📋</button>
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
                <button class="btn btn-copy" onclick="copyTruckDetails('LEFT COMPANY', '${truck.driver_name}', '${truck.driver_license}', '${contactsText.replace(/'/g, "\\'")}')">
                    📋 Copy Details
                </button>
                <button class="btn btn-details" onclick="openEmployeeDriverNoTruckDetails('${truck.id}')">
                    ℹ️ More Details
                </button>
            </div>
        `;
        
    } else {
        // ... rest of your existing code for active drivers and NO DRIVER trucks remains the same
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
                        <span class="info-label">License:</span>
                        <span class="info-value empty-field">-</span>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">Contact:</span>
                        <span class="info-value empty-field">-</span>
                    </div>
                </div>
                
                <div class="button-row">
                    <button class="btn btn-copy" onclick="copyTruckDetails('${truck.truck_number}', 'NO DRIVER', '', '')">
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
            
            // Prepare contacts text for copying
            const contactsText = getContactsTextFromTruck(truck);
            
            card.innerHTML = `
                <div class="card-number">${index + 1}</div>
                ${imageHtml}
                
                <div class="truck-number">${truck.truck_number}</div>
                
                <div class="driver-info">
                    <div class="info-row">
                        <span class="info-label">Name:</span>
                        <span class="info-value">${truck.driver_name}</span>
                        <div class="copy-call-buttons">
                            <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_name}')">📋</button>
                        </div>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">License:</span>
                        <span class="info-value">${truck.driver_license}</span>
                        <div class="copy-call-buttons">
                            <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_license}')">📋</button>
                        </div>
                    </div>
                    
                    ${contactsHtml}
                </div>
                
                <div class="button-row">
                    <button class="btn btn-copy" onclick="copyTruckDetails('${truck.truck_number}', '${truck.driver_name}', '${truck.driver_license}', '${contactsText.replace(/'/g, "\\'")}')">
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
        // Single contact
        contactsHtml = `
            <div class="info-row">
                <span class="info-label">Contact:</span>
                <span class="info-value">${contacts[0].phone_number}</span>
                <div class="copy-call-buttons">
                    <button class="btn btn-copy" onclick="copyToClipboard('${contacts[0].phone_number}')">📋</button>
                    <button class="btn btn-call" onclick="callDriver('${contacts[0].phone_number}')">📞</button>
                </div>
            </div>
        `;
    } else {
        // Multiple contacts
        contacts.forEach((contact, index) => {
            contactsHtml += `
                <div class="info-row">
                    <span class="info-label">Contact ${index + 1}:</span>
                    <span class="info-value">${contact.phone_number}</span>
                    <div class="copy-call-buttons">
                        <button class="btn btn-copy" onclick="copyToClipboard('${contact.phone_number}')">📋</button>
                        <button class="btn btn-call" onclick="callDriver('${contact.phone_number}')">📞</button>
                    </div>
                </div>
            `;
        });
    }
    
    return contactsHtml;
}

function getContactsTextFromTruck(truck) {
    if (!truck.driver_contacts || truck.driver_contacts.length === 0) {
        return 'No contacts';
    }
    
    if (truck.driver_contacts.length === 1) {
        return `Contact: ${truck.driver_contacts[0].phone_number}`;
    } else {
        return truck.driver_contacts.map((contact, index) => 
            `Contact ${index + 1}: ${contact.phone_number}`
        ).join('\n           ');
    }
}
// Helper function to get all contacts as text
function getAllContactsText(contacts) {
    if (!contacts || contacts.length === 0) return '';
    return contacts.map(contact => contact.phone_number).join(', ');
}
function copyTruckDetails(truckNumber, name, license, contacts) {
    // Decode the contacts string (it might be encoded for the onclick)
    const decodedContacts = contacts.replace(/\\'/g, "'");
    const details = `Truck: ${truckNumber}\nName: ${name}\nLicense: ${license}\n${decodedContacts}`;
    
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

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
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

        modal.innerHTML = `
            <div class="modal-content modal-large">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>🚛 Truck Details - No Driver Assigned</h2>
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
        `;
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.onclick = function(event) {
            if (event.target === modal) {
                modal.remove();
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

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
        const hasLicenseDoc = truck.driver_license_url && truck.driver_license_url !== '';
        
        const driverImageHtml = hasDriverImage ? 
            `<img src="${truck.driver_image_url}" alt="Driver" class="driver-image">` : '';
        
        // Generate license actions HTML
        const licenseActionsHtml = hasLicenseDoc ? 
            `<div class="license-actions">
                <button class="btn-view" onclick="viewLicenseDocumentFromUrl('${truck.driver_license_url}')">View </button>
             </div>` :
            '<span style="color: #666;">No license document uploaded</span>';
        
        // Generate contacts HTML for details modal
        const contactsHtml = generateDetailsContactsHtml(truck.driver_contacts);
        
        // SIMPLE previous trucks list
        let previousTrucksHtml = '<div class="no-results">No previous trucks</div>';
        if (truck.previous_trucks) {
            const trucksArray = truck.previous_trucks.split(', ').filter(t => t.trim() !== '');
            if (trucksArray.length > 0) {
                previousTrucksHtml = trucksArray.map((truckNum, index) => 
                    `<div>${index + 1}. ${truckNum}</div>`
                ).join('');
            }
        }

        const statusTitle = truck.status === 'no_truck' ? 'No Truck Assigned' : 'Left Company';
        
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>👨‍💼 Driver Details - ${statusTitle}</h2>
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
        `;
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.onclick = function(event) {
            if (event.target === modal) {
                modal.remove();
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
                    <th>Destination</th>
                    <th>Driver's Posho</th>
                    <th>T/Boy's Posho</th>
                    <th>Comments</th>
                </tr>
            </thead>
            <tbody>
    `;

    allowances.forEach(allowance => {
        tableHTML += `
            <tr>
                <td>${allowance.source}</td>
                <td>${allowance.destination}</td>
                <td class="amount-cell">${formatCurrency(allowance.driver_posho)}</td>
                <td class="amount-cell">${formatCurrency(allowance.tboy_posho)}</td>
                <td class="comments-cell" title="${allowance.comments || 'None'}">${allowance.comments || 'None'}</td>
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
    navigator.clipboard.writeText(text).then(() => {
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
    if (confirm(`Call ${phone}?`)) {
        window.open(`tel:${phone}`, '_self');
    }
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

async function openDetailsModal(truckId) {
    const modal = document.getElementById('detailsModal');
    const modalContent = document.getElementById('modalContent');
    
    if (!modal || !modalContent) return;
    
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
            '<span style="color: #666;">No license document uploaded</span>';
        
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
    } catch (error) {
        console.error('Error loading truck details:', error);
        alert('Error loading truck details');
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


// Apply filters to specific data and display
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
        }, 4000); 
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
        }, 4000);
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
        
        const { data: trucks, error } = await query.order('truck_number');
        
        if (error) throw error;
        
        // Store the data
        currentEmployeeTrucksData[statusTab] = trucks || [];
        
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



// Update the search function to handle filter visibility
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