let currentTruckId = null;
let allTrucks = []; // Store all trucks for filtering
let allAllowances = [];
let currentAllowanceId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadTrucks();
    setupModals();
    setupSearch();
    setupAllowanceModals();
    setupAllowanceSearch();
    loadFieldLabels();
    updateAdminFilterUI();
    
    updateAdminFilterVisibility(currentAdminTab);
    
    // Initialize last updated dates for all tabs
    displayLastUpdatedDate('truck-list');
    displayLastUpdatedDate('allowances');
    displayLastUpdatedDate('distance');
    displayLastUpdatedDate('diesel');
    
    // Setup reactivate modal
    setupReactivateModal();
    
    // NEW: Setup assign truck modals
    setupAssignTruckModals();
    addValidationListeners();
});



// Diesel Data Management
let currentDieselType = 'long_haul';
let currentLevel = 'categories';
let currentCategoryId = null;
let currentRouteId = null;
let dieselNavigationStack = [];

// Add these with your other global variables
let allDieselCategories = [];
let allDieselRoutes = [];
let allDieselTruckData = [];
let currentSearchLevel = 'global'; // 'global', 'categories', 'routes', 'truckData'

// Admin tab management
let currentAdminTab = 'all-trucks';




async function loadTrucksByAdminStatus(statusTab) {
    const statusMap = {
        'all-trucks': ['active'], // Only active status for all-trucks
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
        const { data: trucks, error } = await supabase
            .from('trucks')
            .select(`
                *,
                driver_contacts (*)
            `)
            .in('status', statuses)
            .order('truck_number');
        
        if (error) throw error;
        
        // Store the data for searching
        currentTrucksData[statusTab] = trucks || [];
        
        // Display with proper numbering starting from 1
        displayTrucksInAdminContainer(currentTrucksData[statusTab], containerId);
        
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
function displayTrucksInAdminContainer(trucks, containerId) {
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error(`Container with id '${containerId}' not found`);
        return;
    }
    
    if (!trucks || trucks.length === 0) {
        container.innerHTML = '<div class="no-results">No results found.</div>';
        return;
    }
    
    container.innerHTML = '';
    
    // Always start numbering from 1 for the displayed trucks
    trucks.forEach((truck, index) => {
        let truckCard;
        
        if (containerId === 'no-truck-list') {
            truckCard = createDriverNoTruckCard(truck, index);
        } else if (containerId === 'trucks-list') {
            if (truck.driver_name === 'NO DRIVER' || !truck.driver_name) {
                truckCard = createNoDriverCard(truck, index);
            } else {
                truckCard = createActiveDriverCard(truck, index);
            }
        } else if (containerId === 'left-list') {
            truckCard = createDriverLeftCard(truck, index);
        }
        
        if (truckCard) {
            container.appendChild(truckCard);
        }
    });
}
async function openDriverLeftDetailsModal(truckId) {
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
                <button class="btn-view" onclick="viewLicenseDocumentFromUrl('${truck.driver_license_url}')">View</button>
             </div>` :
            '<span style="color: #666;">No license document uploaded</span>';
        
        // Generate contacts HTML for details modal
        const contactsHtml = generateDetailsContactsHtml(truck.driver_contacts);
        
        // Create previous trucks list with numbers
        let previousTrucksHtml = '<div class="no-results">No previous trucks</div>';
        if (truck.previous_trucks) {
            const trucksArray = truck.previous_trucks.split(', ').filter(t => t.trim() !== '');
            if (trucksArray.length > 0) {
                previousTrucksHtml = trucksArray.map((truckNum, index) => 
                    `<div class="detail-item">
                         <span class="detail-label">${index + 1}:</span>
                         <span class="detail-value">${truckNum}</span>
                     </div>`
                ).join('');
            }
        }
        
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
                <h2>👨‍💼 Driver Details - Left Company</h2>
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
                        <div class="detail-item">
                            <span class="detail-label">Previous Trucks:</span>
                            <div class="previous-trucks-list" style="max-height: 300px; overflow-y: auto;">
                                ${previousTrucksHtml}
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
// Placeholder function for reactivating driver
function reactivateDriver(truckId) {
    // Will implement later
    alert('Reactivate driver - ID: ' + truckId);
}

// Confirm moving driver from "No Trucks" to "Left" section
function confirmMoveToLeft(truckId) {
    currentTruckId = truckId;
    pendingAction = 'move_to_left';
    
    document.getElementById('confirmTitle').textContent = 'Confirm Driver Left';
    document.getElementById('confirmMessage').textContent = 'Are you sure you want to mark this driver as having left the company? This will move the driver to "Drivers Who Left" section.';
    document.getElementById('confirmModal').style.display = 'block';
}
async function openNoDriverDetailsModal(truckId) {
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
                            <span class="detail-label">Phone:</span>
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
async function openDriverNoTruckDetailsModal(truckId) {
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
                <button class="btn-view" onclick="viewLicenseDocumentFromUrl('${truck.driver_license_url}')">View</button>
             </div>` :
            '<span style="color: #666;">No license document uploaded</span>';
        
        // Generate contacts HTML for details modal
        const contactsHtml = generateDetailsContactsHtml(truck.driver_contacts);
        
        // Create previous trucks list with numbers - FIXED LAYOUT
        let previousTrucksHtml = '<div class="no-results">No previous trucks</div>';
        if (truck.previous_trucks) {
            const trucksArray = truck.previous_trucks.split(', ').filter(t => t.trim() !== '');
            if (trucksArray.length > 0) {
                previousTrucksHtml = trucksArray.map((truckNum, index) => 
                    `<div class="detail-item">
                         <span class="detail-label">${index + 1}:</span>
                         <span class="detail-value">${truckNum}</span>
                     </div>`
                ).join('');
            }
        }
        
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>👨‍💼 Driver Details - No Truck Assigned</h2>
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
                        <h3>Previous Trucks</h3>
                        <div class="previous-trucks-list" style="max-height: 300px; overflow-y: auto;">
                            ${previousTrucksHtml}
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
function assignTruck(truckId) {
    // Will implement later
    alert('Assign truck to driver - ID: ' + truckId);
}
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

async function deleteDieselRoute(routeId) {
    if (confirm('Are you sure you want to delete this route? All associated truck data will also be deleted.')) {
        try {
            const { error } = await supabase
                .from('diesel_routes')
                .delete()
                .eq('id', routeId);
            
            if (error) throw error;
            
           showSuccessModal('Category deleted successfully!');
            
            // UPDATE LAST UPDATED DATE - ADD THIS LINE
            await updateLastUpdatedDate('diesel');
            
            // Refresh routes
            openDieselRoutes(currentCategoryId, 'Category Name');
            
        } catch (error) {
            console.error('Error deleting route:', error);
            showErrorModal('Error deleting category: ' + error.message);
    }
}}
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
// Open modal for adding new truck data
function openAddDieselTruckDataModal() {
    if (!currentRouteId) {
        alert('Please select a route first');
        return;
    }
    
    document.getElementById('dieselTruckDataModalTitle').textContent = '➕ Add Truck Data';
    document.getElementById('dieselTruckDataForm').reset();
    document.getElementById('editTruckDataId').value = '';
    document.getElementById('editTruckDataRouteId').value = currentRouteId;
    
    document.getElementById('dieselTruckDataModal').style.display = 'block';
}

// Open modal for editing existing truck data
async function editDieselTruckData(truckDataId) {
    try {
        const { data: truckData, error } = await supabase
            .from('diesel_truck_data')
            .select('*')
            .eq('id', truckDataId)
            .single();
        
        if (error) throw error;
        
        document.getElementById('dieselTruckDataModalTitle').textContent = '✏️ Edit Truck Data';
        document.getElementById('editTruckDataId').value = truckData.id;
        document.getElementById('editTruckDataRouteId').value = truckData.route_id;
        document.getElementById('truckDataType').value = truckData.truck_type;
        document.getElementById('distance113').value = truckData.distance_113 || '';
        document.getElementById('distance114').value = truckData.distance_114 || '';
        document.getElementById('p360').value = truckData.p360 || '';
        document.getElementById('shacman').value = truckData.shacman || '';
        document.getElementById('howoOld').value = truckData.howo_old || '';
        document.getElementById('howoNew').value = truckData.howo_new || '';
        document.getElementById('semiScaniaBody').value = truckData.semi_scania_body || '';
        document.getElementById('semiScaniaFlatBed').value = truckData.semi_scania_flat_bed || '';
        document.getElementById('semiHowoBody').value = truckData.semi_howo_body || '';
        document.getElementById('semiHowoFlatBed').value = truckData.semi_howo_flat_bed || '';
        document.getElementById('semiShacmanBody').value = truckData.semi_shacman_body || '';
        document.getElementById('semiShacmanFlatBed').value = truckData.semi_shacman_flat_bed || '';
        
        document.getElementById('dieselTruckDataModal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading truck data:', error);
        alert('Error loading truck data');
    }
}

async function handleDieselTruckDataSubmit(event) {
    event.preventDefault();
    
    const truckDataId = document.getElementById('editTruckDataId').value;
    const routeId = document.getElementById('editTruckDataRouteId').value;
    const truckType = document.getElementById('truckDataType').value;
    
    const formData = {
        route_id: routeId,
        truck_type: truckType,
        distance_113: document.getElementById('distance113').value || null,
        distance_114: document.getElementById('distance114').value || null,
        p360: document.getElementById('p360').value || null,
        shacman: document.getElementById('shacman').value || null,
        howo_old: document.getElementById('howoOld').value || null,
        howo_new: document.getElementById('howoNew').value || null,
        semi_scania_body: document.getElementById('semiScaniaBody').value || null,
        semi_scania_flat_bed: document.getElementById('semiScaniaFlatBed').value || null,
        semi_howo_body: document.getElementById('semiHowoBody').value || null,
        semi_howo_flat_bed: document.getElementById('semiHowoFlatBed').value || null,
        semi_shacman_body: document.getElementById('semiShacmanBody').value || null,
        semi_shacman_flat_bed: document.getElementById('semiShacmanFlatBed').value || null
    };
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Saving...';
    submitBtn.disabled = true;
    
    try {
        let error;
        
        if (truckDataId) {
            // Update existing record
            ({ error } = await supabase
                .from('diesel_truck_data')
                .update(formData)
                .eq('id', truckDataId));
        } else {
            // Insert new record
            ({ error } = await supabase
                .from('diesel_truck_data')
                .insert([formData]));
        }
        
        if (error) throw error;
        
        alert('✅ Truck data saved successfully!');
        document.getElementById('dieselTruckDataModal').style.display = 'none';
        
        // UPDATE LAST UPDATED DATE - ADD THIS LINE
        await updateLastUpdatedDate('diesel');
        
        // Refresh the truck data display
        if (currentRouteId) {
            openDieselTruckData(currentRouteId, document.querySelector('.diesel-truck-card .diesel-truck-header')?.textContent || 'Route');
        }
        
    } catch (error) {
        console.error('Error saving truck data:', error);
        alert('❌ Error saving truck data: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteDieselTruckData(truckDataId) {
    if (!confirm('Are you sure you want to delete this truck data?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('diesel_truck_data')
            .delete()
            .eq('id', truckDataId);
        
        if (error) throw error;
        
        alert('✅ Truck data deleted successfully!');
        
        // UPDATE LAST UPDATED DATE - ADD THIS LINE
        await updateLastUpdatedDate('diesel');
        
        // Refresh the truck data display
        if (currentRouteId) {
            openDieselTruckData(currentRouteId, document.querySelector('.diesel-truck-card .diesel-truck-header')?.textContent || 'Route');
        }
        
    } catch (error) {
        console.error('Error deleting truck data:', error);
        alert('❌ Error deleting truck data: ' + error.message);
    }
}
// Initialize the truck data form
document.addEventListener('DOMContentLoaded', function() {
    const truckDataForm = document.getElementById('dieselTruckDataForm');
    if (truckDataForm) {
        truckDataForm.onsubmit = handleDieselTruckDataSubmit;
    }
    
    // Close modal when clicking X
    const truckDataModal = document.getElementById('dieselTruckDataModal');
    if (truckDataModal) {
        const closeBtn = truckDataModal.querySelector('.close');
        closeBtn.onclick = () => {
            truckDataModal.style.display = 'none';
        };
        
        // Close modal when clicking outside
        window.onclick = (event) => {
            if (event.target === truckDataModal) {
                truckDataModal.style.display = 'none';
            }
        };
    }
});




function resetDieselNavigation() {
    dieselNavigationStack = [];
    showMainTabs();
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

async function deleteDieselCategory(categoryId) {
    if (confirm('Are you sure you want to delete this category? All associated routes and truck data will also be deleted.')) {
        try {
            const { error } = await supabase
                .from('diesel_categories')
                .delete()
                .eq('id', categoryId);
            
            if (error) throw error;
            
           showSuccessModal('Category deleted successfully!');
            
            // UPDATE LAST UPDATED DATE - ADD THIS LINE
            await updateLastUpdatedDate('diesel');
            
            // Refresh categories
            loadDieselCategories();
            
        } catch (error) {
            console.error('Error deleting category:', error);
           showErrorModal('Error deleting category: ' + error.message);
        }
    }
}



function setupAllowanceModals() {
    // Add Allowance Modal
    const addAllowanceModal = document.getElementById('addAllowanceModal');
    const addAllowanceCloseBtn = addAllowanceModal.querySelector('.close');
    const addAllowanceForm = document.getElementById('addAllowanceForm');

    addAllowanceCloseBtn.onclick = () => {
        addAllowanceModal.style.display = 'none';
    };
    
    addAllowanceForm.onsubmit = handleAddAllowanceSubmit;

    // Edit Allowance Modal
    const editAllowanceModal = document.getElementById('editAllowanceModal');
    const editAllowanceCloseBtn = editAllowanceModal.querySelector('.close');
    const editAllowanceForm = document.getElementById('editAllowanceForm');

    editAllowanceCloseBtn.onclick = () => {
        editAllowanceModal.style.display = 'none';
    };
    
    editAllowanceForm.onsubmit = handleEditAllowanceSubmit;

    // Close modals when clicking outside
    window.onclick = (event) => {
        if (event.target === addAllowanceModal) {
            addAllowanceModal.style.display = 'none';
        }
        if (event.target === editAllowanceModal) {
            editAllowanceModal.style.display = 'none';
        }
    };
}
// In your existing setupSearch() function in admin.js, update this:
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Change from handleAdminSearch to the new function
        searchInput.addEventListener('input', handleAdminSearch);
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
        // Show all trucks if search is empty
        displayTrucks(allTrucks);
        if (resultsCount) {
            resultsCount.textContent = `Showing all ${allTrucks.length} trucks`;
        }
        return;
    }
    
    const filteredTrucks = allTrucks.filter(truck => {
        // Search in all fields
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

function resetFileInputs(modalType) {
    if (modalType === 'edit') {
        document.getElementById('editDriverImage').value = '';
        document.getElementById('editTruckImage').value = '';
    } else {
        document.getElementById('addDriverImage').value = '';
        document.getElementById('addTruckImage').value = '';
    }
}

async function loadTrucks() {
    // Load trucks for all three admin tabs initially
    await loadTrucksByAdminStatus('all-trucks');
    await loadTrucksByAdminStatus('no-truck');
    await loadTrucksByAdminStatus('left');
}
function displayTrucks(trucks) {
    const trucksList = document.getElementById('trucks-list');
    
    if (trucks.length === 0) {
        trucksList.innerHTML = '<div class="no-results">No results found matching your search.</div>';
        return;
    }

    trucksList.innerHTML = '';
    trucks.forEach(truck => {
        const truckCard = createAdminTruckCard(truck);
        trucksList.appendChild(truckCard);
    });
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

        allAllowances = allowances;

        if (!allowances || allowances.length === 0) {
            allowancesList.innerHTML = '<div class="error">No allowances found in the database.</div>';
            return;
        }

        displayAllowances(allowances);
        const resultsCount = document.getElementById('allowanceSearchResultsCount');
        if (resultsCount) {
            resultsCount.textContent = `Showing all ${allowances.length} allowances`;
        }
    } catch (error) {
        console.error('Error loading allowances:', error);
        allowancesList.innerHTML = '<div class="error">Error loading allowances: ' + error.message + '</div>';
    }
}

function displayAllowances(allowances) {
    const allowancesList = document.getElementById('allowances-list');
    
    if (allowances.length === 0) {
        allowancesList.innerHTML = '<div class="no-results">No allowances found matching your search.</div>';
        return;
    }

    let tableHTML = `
        <table class="allowances-table">
            <thead>
                <tr>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Driver's Posho</th>
                    <th>T/Boy's Posho</th>
                    <th>Comments</th>
                    <th>Actions</th>
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
                <td>
                    <div class="allowance-actions">
                        <button class="btn btn-edit" onclick="openEditAllowanceModal('${allowance.id}')">✏️ Edit</button>
                    </div>
                </td>
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
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function openAddAllowanceModal() {
    document.getElementById('addAllowanceModal').style.display = 'block';
}

async function openEditAllowanceModal(allowanceId) {
    currentAllowanceId = allowanceId;
    const modal = document.getElementById('editAllowanceModal');
    
    try {
        const { data: allowance, error } = await supabase
            .from('allowances')
            .select('*')
            .eq('id', allowanceId)
            .single();

        if (error) throw error;

        // Fill form with current data
        document.getElementById('editAllowanceId').value = allowance.id;
        document.getElementById('editSource').value = allowance.source || '';
        document.getElementById('editDestination').value = allowance.destination || '';
        document.getElementById('editDriverPosho').value = allowance.driver_posho || '';
        document.getElementById('editTboyPosho').value = allowance.tboy_posho || '';
        document.getElementById('editComments').value = allowance.comments || 'None';
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading allowance details:', error);
        alert('❌ Error loading allowance details. Please check console.');
    }
}

async function handleAddAllowanceSubmit(event) {
    event.preventDefault();
    
    const source = document.getElementById('addSource').value;
    const destination = document.getElementById('addDestination').value;
    const driverPosho = parseInt(document.getElementById('addDriverPosho').value);
    const tboyPosho = parseInt(document.getElementById('addTboyPosho').value);
    const comments = document.getElementById('addComments').value || 'None';
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Adding...';
    submitBtn.disabled = true;
    
    try {
        const { error } = await supabase
            .from('allowances')
            .insert({
                source: source,
                destination: destination,
                driver_posho: driverPosho,
                tboy_posho: tboyPosho,
                comments: comments
            });
        
        if (error) throw error;
        
       showSuccessModal('Allowance added successfully!');
        document.getElementById('addAllowanceModal').style.display = 'none';
        document.getElementById('addAllowanceForm').reset();
        loadAllowances();
        await updateLastUpdatedDate('allowances');
        
    } catch (error) {
        console.error('Error adding allowance:', error);
        showErrorModal('Error adding allowance: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function handleEditAllowanceSubmit(event) {
    event.preventDefault();
    
    const source = document.getElementById('editSource').value;
    const destination = document.getElementById('editDestination').value;
    const driverPosho = parseInt(document.getElementById('editDriverPosho').value);
    const tboyPosho = parseInt(document.getElementById('editTboyPosho').value);
    const comments = document.getElementById('editComments').value || 'None';
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Saving...';
    submitBtn.disabled = true;
    
    try {
        const { error } = await supabase
            .from('allowances')
            .update({
                source: source,
                destination: destination,
                driver_posho: driverPosho,
                tboy_posho: tboyPosho,
                comments: comments
            })
            .eq('id', currentAllowanceId);
        
        if (error) throw error;
        
        showSuccessModal('Allowance updated successfully!');
        document.getElementById('editAllowanceModal').style.display = 'none';
        loadAllowances();
        await updateLastUpdatedDate('allowances');
        
    } catch (error) {
        console.error('Error updating allowance:', error);
        showErrorModal('Error updating allowance: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
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
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

async function openEditModal(truckId) {
    currentTruckId = truckId;
    const modal = document.getElementById('editModal');
    
    try {
        // Load field labels first
        await loadFieldLabels();
        
        // Load truck data with contacts
        const { data: truck, error } = await supabase
            .from('trucks')
            .select(`
                *,
                driver_contacts (*)
            `)
            .eq('id', truckId)
            .single();

        if (error) throw error;

        // Clear dynamic fields container before adding new ones
        const dynamicContainer = document.getElementById('editDynamicFieldsContainer');
        if (dynamicContainer) {
            dynamicContainer.innerHTML = '';
        }

        // Clear additional images container
        const imagesContainer = document.getElementById('editAdditionalImagesContainer');
        if (imagesContainer) {
            imagesContainer.innerHTML = '';
        }

        // Fill form with current data
        document.getElementById('editTruckId').value = truck.id;
        document.getElementById('editTruckNumber').value = truck.truck_number || '';
        document.getElementById('editDriverName').value = truck.driver_name || '';
        document.getElementById('editDriverLicense').value = truck.driver_license || '';
        document.getElementById('editDriverLicenseUrl').value = truck.driver_license_url || '';
        
        // Load and display current license document section
        const hasLicenseDoc = truck.driver_license_url && truck.driver_license_url !== '';
        const currentLicenseSection = document.getElementById('currentLicenseSection');
        if (currentLicenseSection) {
            if (hasLicenseDoc) {
                currentLicenseSection.style.display = 'block';
                // Store the current license URL for the buttons
                currentLicenseSection.setAttribute('data-license-url', truck.driver_license_url);
            } else {
                currentLicenseSection.style.display = 'none';
            }
        }
        
        // Load contacts
        await loadDriverContacts(truckId);
        
        // FILL TRUCK SPECIFICATIONS
        document.getElementById('editTruckType').value = truck.truck_type || '';
        document.getElementById('editTruckBody').value = truck.truck_body || '';
        document.getElementById('editTruckMake').value = truck.truck_make || '';
        document.getElementById('editTruckTons').value = truck.truck_tons || '';
        
        // FILL COMESA/C28
        const comesaSelect = document.getElementById('editComesa');
        const c28Select = document.getElementById('editC28');
        const comesaExpiryInput = document.getElementById('editComesaExpiry');
        const c28ExpiryInput = document.getElementById('editC28Expiry');

        if (comesaSelect) comesaSelect.value = truck.comesa || 'NO';
        if (c28Select) c28Select.value = truck.c28 || 'NO';
        if (comesaExpiryInput) comesaExpiryInput.value = truck.comesa_expiry || '';
        if (c28ExpiryInput) c28ExpiryInput.value = truck.c28_expiry || '';
        
        // Fill dynamic fields
        Object.keys(fieldLabels).forEach(key => {
            if (truck[key] && !['id', 'truck_number', 'driver_name', 'driver_license', 'driver_phone', 'driver_image_url', 'truck_image_url', 'driver_license_url', 'created_at', 'status', 'comesa', 'c28', 'comesa_expiry', 'c28_expiry', 'truck_type', 'truck_body', 'truck_make', 'truck_tons'].includes(key)) {
                addDynamicFieldToForm('edit', key, fieldLabels[key], truck[key]);
            }
        });
        
        // Load additional fields
        await loadAdditionalFields(truckId);
        
        // Load truck images
        await loadTruckImages(truckId);
        
        // SET CURRENT IMAGES
        const currentDriverImage = document.getElementById('currentDriverImage');
        const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
        if (currentDriverImage) {
            if (hasDriverImage) {
                currentDriverImage.src = truck.driver_image_url;
                currentDriverImage.style.display = 'block';
            } else {
                currentDriverImage.style.display = 'none';
            }
        }
        
        const currentTruckImage = document.getElementById('currentTruckImage');
        const hasTruckImage = truck.truck_image_url && truck.truck_image_url !== '';
        if (currentTruckImage) {
            if (hasTruckImage) {
                currentTruckImage.src = truck.truck_image_url;
                currentTruckImage.style.display = 'block';
            } else {
                currentTruckImage.style.display = 'none';
            }
        }
        
        // NEW: Improved No Driver mode detection
        const noDriverBtn = document.getElementById('editNoDriverBtn');
        if (noDriverBtn) {
            // More comprehensive check for "NO DRIVER" status
            const isNoDriverTruck = 
                truck.driver_name === 'NO DRIVER' || 
                !truck.driver_name || 
                truck.driver_name.trim() === '' ||
                (truck.driver_license === '' && (!truck.driver_contacts || truck.driver_contacts.length === 0));
            
            if (isNoDriverTruck) {
                // Activate No Driver mode
                noDriverBtn.classList.add('active');
                noDriverBtn.innerHTML = '✅ No Driver Mode Active';
                noDriverBtn.style.backgroundColor = '#28a745';
                disableEditDriverFields();
                
                // Ensure the form reflects No Driver state
                document.getElementById('editDriverName').value = 'NO DRIVER';
                document.getElementById('editDriverLicense').value = '';
                document.getElementById('editDriverLicenseUrl').value = '';
                
                // Clear contacts container and add one disabled field
                const contactsContainer = document.getElementById('editContactsContainer');
                contactsContainer.innerHTML = `
                    <div class="contact-input-group">
                        <input type="text" class="contact-input" placeholder="No driver - field disabled" value="" readonly style="background-color: #f8f9fa; cursor: not-allowed;">
                        <button type="button" class="btn-remove-contact" onclick="removeContactField(this)">🗑️</button>
                    </div>
                `;
                
                // Hide the "Add Another Number" button
                const addContactBtn = document.querySelector('#editContactsContainer').nextElementSibling;
                if (addContactBtn && addContactBtn.classList.contains('btn-secondary')) {
                    addContactBtn.style.display = 'none';
                }
            } else {
                // Ensure No Driver mode is off
                noDriverBtn.classList.remove('active');
                noDriverBtn.innerHTML = '🚫 No Driver';
                noDriverBtn.style.backgroundColor = '#ffc107';
                enableEditDriverFields();
            }
        }

if (comesaSelect) {
    comesaSelect.value = truck.comesa || 'NO';
    // Trigger the change handler to show/hide expiry field
    handleComesaChange('edit');
    
    // If COMESA is YES and there's an expiry date, set it
    if (truck.comesa === 'YES' && truck.comesa_expiry) {
        comesaExpiryInput.value = truck.comesa_expiry;
    }
}

if (c28Select) {
    c28Select.value = truck.c28 || 'NO';
    // Trigger the change handler to show/hide expiry field
    handleC28Change('edit');
    
    // If C28 is YES and there's an expiry date, set it
    if (truck.c28 === 'YES' && truck.c28_expiry) {
        c28ExpiryInput.value = truck.c28_expiry;
    }
}
        // Reset modal state (but preserve No Driver mode)
        resetEditModalStatePreservingNoDriver();
        
        modal.style.display = 'block';
        
        // Update save button state
        updateEditSaveButtonState();
        
    } catch (error) {
        console.error('Error loading truck details:', error);
        alert('❌ Error loading truck details. Please check console.');
    }
}

// NEW FUNCTION: Reset edit modal state while preserving No Driver mode
function resetEditModalStatePreservingNoDriver() {
    // Reset section states
    modalStates.edit.fieldSectionOpen = false;
    modalStates.edit.imageSectionOpen = false;
    
    // Hide sections
    const fieldSection = document.getElementById('editFieldSection');
    const imageSection = document.getElementById('editImageSection');
    
    if (fieldSection) fieldSection.style.display = 'none';
    if (imageSection) imageSection.style.display = 'none';
    
    // Clear input fields (but don't affect No Driver mode)
    const fieldLabel = document.getElementById('editNewFieldLabel');
    const fieldValue = document.getElementById('editNewFieldValue');
    const imageDesc = document.getElementById('editNewImageDescription');
    const imageFile = document.getElementById('editNewAdditionalImage');
    
    if (fieldLabel) fieldLabel.value = '';
    if (fieldValue) fieldValue.value = '';
    if (imageDesc) imageDesc.value = '';
    if (imageFile) imageFile.value = '';
    
    // Note: We don't reset No Driver mode here - it's handled in openEditModal
}
async function openAdminDetailsModal(truckId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
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

        // Only show images that actually exist in database
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

        modal.innerHTML = `
            <div class="modal-content modal-large">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>🚛 Truck Details</h2>
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
// UPDATED: Open add truck modal with proper contact initialization
function openAddTruckModal() {
    // Reset the form first
    document.getElementById('addForm').reset();
    resetModalState('add');
    
    // Ensure No Driver mode is off and fields are enabled
    const noDriverBtn = document.getElementById('noDriverBtn');
    if (noDriverBtn && noDriverBtn.classList.contains('active')) {
        noDriverBtn.classList.remove('active');
        noDriverBtn.innerHTML = '🚫 No Driver';
        noDriverBtn.style.backgroundColor = '#ffc107';
    }
    enableDriverFields();
    
    // Reset contacts container with one empty field
    const contactsContainer = document.getElementById('addContactsContainer');
    contactsContainer.innerHTML = `
        <div class="contact-input-group">
            <input type="text" class="contact-input"  required>
            <button type="button" class="btn-remove-contact" onclick="removeContactField(this)">🗑️</button>
        </div>
    `;
    
    // Ensure the dustbin icon is visible
    updateContactRemoveButtons('addContactsContainer');
    
    // Show the modal
    document.getElementById('addModal').style.display = 'block';
    
    // Update save button state
    updateSaveButtonState();
}
let fieldLabels = {};
let pendingAction = null;

// Load field labels from database
async function loadFieldLabels() {
    try {
        const { data: fields, error } = await supabase
            .from('truck_fields')
            .select('*')
            .order('field_order');
        
        if (error) throw error;
        
        fieldLabels = {};
        fields.forEach(field => {
            fieldLabels[field.field_key] = field.field_label;
        });
        
        // Update labels in edit modal
        Object.keys(fieldLabels).forEach(key => {
            const labelElement = document.getElementById(`label-${key.replace('_', '-')}`);
            if (labelElement) {
                labelElement.textContent = fieldLabels[key] + ':';
            }
        });
        
    } catch (error) {
        console.error('Error loading field labels:', error);
    }
}



// UPDATED: Load additional fields
async function loadAdditionalFields(truckId) {
    try {
        const { data: additionalFields, error } = await supabase
            .from('truck_additional_fields')
            .select('*')
            .eq('truck_id', truckId);
        
        if (error) throw error;
        
        const container = document.getElementById('editDynamicFieldsContainer');
        
        // Clear any existing additional fields to prevent duplicates
        if (container) {
            container.innerHTML = '';
        }
        
        additionalFields.forEach(field => {
            addDynamicFieldToForm('edit', field.field_key, field.field_label, field.field_value, field.id);
        });
    } catch (error) {
        console.error('Error loading additional fields:', error);
    }
}
// UPDATED: Load truck images
async function loadTruckImages(truckId) {
    try {
        const { data: additionalImages, error } = await supabase
            .from('truck_additional_images')
            .select('*')
            .eq('truck_id', truckId);
        
        if (error) throw error;
        
        const container = document.getElementById('editAdditionalImagesContainer');
        
        // Clear any existing additional images to prevent duplicates
        if (container) {
            container.innerHTML = '';
        }
        
        additionalImages.forEach(image => {
            addAdditionalImageToForm('edit', image.id, image.image_url, image.description);
        });
    } catch (error) {
        console.error('Error loading additional images:', error);
    }
}
// UPDATED: Add dynamic field to form for both modals (safer version)
function addDynamicFieldToForm(modalType, fieldKey, fieldLabel, fieldValue, fieldId = null) {
    const container = document.getElementById(`${modalType}DynamicFieldsContainer`);
    
    // Check if container exists
    if (!container) {
        console.error(`Container with ID '${modalType}DynamicFieldsContainer' not found`);
        return;
    }
    
    const fieldIdAttr = fieldId || `new_${Date.now()}`;
    
    const fieldHtml = `
        <div class="dynamic-field-item" data-field-id="${fieldIdAttr}" data-field-key="${fieldKey}">
            <div class="dynamic-field-info">
                <input type="text" value="${fieldLabel}" placeholder="Field Label">
                <input type="text" value="${fieldValue}" placeholder="Field Value">
            </div>
            <button type="button" class="remove-field-btn" onclick="removeField('${modalType}', '${fieldIdAttr}')">🗑️</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', fieldHtml);
}
// UPDATED: Add additional image to form for both modals (safer version)
function addAdditionalImageToForm(modalType, imageId, imageUrl, description = '') {
    const container = document.getElementById(`${modalType}AdditionalImagesContainer`);
    
    // Check if container exists
    if (!container) {
        console.error(`Container with ID '${modalType}AdditionalImagesContainer' not found`);
        return;
    }
    
    const imageHtml = `
        <div class="additional-image-item" data-image-id="${imageId}">
            <img src="${imageUrl}" alt="Additional Image" class="additional-image-preview">
            <div class="additional-image-info">
                <p><strong>Description:</strong> ${description || 'No description'}</p>
            </div>
            <button type="button" class="remove-image-btn" onclick="removeAdditionalImage('${modalType}', '${imageId}')">🗑️ Remove</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', imageHtml);
}
// Toggle add field section
function toggleAddFieldSection() {
    const section = document.getElementById('addFieldSection');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

// Toggle add image section
function toggleAddImageSection() {
    const section = document.getElementById('addImageSection');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

// Add new field
function addNewField() {
    const label = document.getElementById('newFieldLabel').value;
    const value = document.getElementById('newFieldValue').value;
    
    if (!label || !value) {
        alert('Please fill in both field name and value');
        return;
    }
    
    const fieldKey = `custom_${Date.now()}`;
    addDynamicFieldToForm(fieldKey, label, value);
    
    // Clear inputs
    document.getElementById('newFieldLabel').value = '';
    document.getElementById('newFieldValue').value = '';
    
    // Hide section
    toggleAddFieldSection();
}

// Add additional image
async function addAdditionalImage() {
    const description = document.getElementById('newImageDescription').value;
    const imageFile = document.getElementById('newAdditionalImage').files[0];
    
    if (!imageFile) {
        alert('Please select an image file');
        return;
    }
    
    try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `additional-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('driver-images')
            .upload(fileName, imageFile, {
                upsert: true,
                cacheControl: '3600'
            });
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
            .from('driver-images')
            .getPublicUrl(fileName);
        
        // Add to form
        addAdditionalImageToForm(`new_${Date.now()}`, urlData.publicUrl, description);
        
        // Clear inputs
        document.getElementById('newImageDescription').value = '';
        document.getElementById('newAdditionalImage').value = '';
        
        // Hide section
        toggleAddImageSection();
        
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image');
    }
}

async function handleEditFormSubmit(event) {
    event.preventDefault();
    
    // Check if No Driver mode is active in Edit modal
    const noDriverBtn = document.getElementById('editNoDriverBtn');
    const noDriverMode = noDriverBtn ? noDriverBtn.classList.contains('active') : false;
    
    // Validate form
    const validationErrors = validateTruckForm('edit', noDriverMode);
    if (validationErrors.length > 0) {
        alert('❌ Please fix the following errors:\n\n' + validationErrors.join('\n'));
        return;
    }
    
    const truckId = document.getElementById('editTruckId').value;
    const truckNumber = document.getElementById('editTruckNumber').value;
    
    // CRITICAL: Always use the actual form values, not the potentially disabled ones
    const driverName = noDriverMode ? 'NO DRIVER' : document.getElementById('editDriverName').value;
    const driverLicense = noDriverMode ? '' : document.getElementById('editDriverLicense').value;
    const driverLicenseUrl = noDriverMode ? '' : document.getElementById('editDriverLicenseUrl').value;
    
    const comesa = document.getElementById('editComesa').value;
    const c28 = document.getElementById('editC28').value;
    
    // Safely get expiry dates
    const comesaExpiryInput = document.getElementById('editComesaExpiry');
    const c28ExpiryInput = document.getElementById('editC28Expiry');
    const comesaExpiry = comesaExpiryInput ? comesaExpiryInput.value || null : null;
    const c28Expiry = c28ExpiryInput ? c28ExpiryInput.value || null : null;
    
    const driverImageFile = noDriverMode ? null : document.getElementById('editDriverImage').files[0];
    const truckImageFile = document.getElementById('editTruckImage').files[0];
    
    // Get contacts from edit form (empty array in No Driver mode)
    const contacts = noDriverMode ? [] : getContactsFromForm('edit');
    if (!noDriverMode && contacts.length === 0) {
        alert('Please add at least one contact number');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Saving...';
    submitBtn.disabled = true;
    
    try {
        let driverImageUrl = null;
        let truckImageUrl = null;
        
        // Get current values to preserve if no new file is uploaded
        const currentDriverImage = document.getElementById('currentDriverImage');
        const currentTruckImage = document.getElementById('currentTruckImage');
        
        // Only update driver image if not in No Driver mode and there's a current image or new file
        if (!noDriverMode) {
            if (!driverImageFile && currentDriverImage.style.display !== 'none') {
                driverImageUrl = currentDriverImage.src;
            }
            
            // Upload new driver image if selected
            if (driverImageFile) {
                const fileExt = driverImageFile.name.split('.').pop();
                const fileName = `driver-${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('driver-images')
                    .upload(fileName, driverImageFile, {
                        upsert: true,
                        cacheControl: '3600'
                    });
                
                if (uploadError) throw uploadError;
                
                const { data: urlData } = supabase.storage
                    .from('driver-images')
                    .getPublicUrl(fileName);
                
                driverImageUrl = urlData.publicUrl;
            }
        } else {
            // In No Driver mode, clear driver image and license URL
            driverImageUrl = null;
        }
        
        // Handle truck image (always required)
        if (!truckImageFile && currentTruckImage.style.display !== 'none') {
            truckImageUrl = currentTruckImage.src;
        }
        
        // Upload new truck image if selected
        if (truckImageFile) {
            const fileExt = truckImageFile.name.split('.').pop();
            const fileName = `truck-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('driver-images')
                .upload(fileName, truckImageFile, {
                    upsert: true,
                    cacheControl: '3600'
                });
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
                .from('driver-images')
                .getPublicUrl(fileName);
            
            truckImageUrl = urlData.publicUrl;
        }
        
        // Update truck record - ensure No Driver data is properly saved
        const updateData = {
            truck_number: truckNumber,
            driver_name: driverName, // This will be 'NO DRIVER' in No Driver mode
            driver_license: driverLicense, // This will be empty in No Driver mode
            driver_license_url: driverLicenseUrl, // This will be empty in No Driver mode
            driver_image_url: driverImageUrl, // This will be null in No Driver mode
            truck_image_url: truckImageUrl,
            comesa: comesa,
            c28: c28,
            comesa_expiry: comesaExpiry,
            c28_expiry: c28Expiry,
            // Add truck specifications
            truck_type: document.getElementById('editTruckType').value,
            truck_body: document.getElementById('editTruckBody').value,
            truck_make: document.getElementById('editTruckMake').value,
            truck_tons: document.getElementById('editTruckTons').value
        };
        
        // Add dynamic fields to update data
        const fieldElements = document.querySelectorAll('#editDynamicFieldsContainer .dynamic-field-item');
        fieldElements.forEach(element => {
            const fieldKey = element.getAttribute('data-field-key');
            const valueInput = element.querySelector('input[placeholder="Field Value"]');
            if (valueInput && valueInput.value) {
                updateData[fieldKey] = valueInput.value;
            }
        });
        
        const { error: updateError } = await supabase
            .from('trucks')
            .update(updateData)
            .eq('id', truckId);
        
        if (updateError) throw updateError;
        
        // Update contacts only if not in No Driver mode
        if (!noDriverMode) {
            await updateDriverContacts(truckId, contacts);
        } else {
            // In No Driver mode, delete all contacts
            const { error: deleteContactsError } = await supabase
                .from('driver_contacts')
                .delete()
                .eq('truck_id', truckId);
            
            if (deleteContactsError) throw deleteContactsError;
        }
        
        // Save additional fields and images
        await saveAdditionalFields();
        await saveAdditionalImages();
        
        showSuccessModal('Truck updated successfully!');
        document.getElementById('editModal').style.display = 'none';
        resetFileInputs('edit');
        await updateLastUpdatedDate('truck-list');
        loadTrucks();
        
    } catch (error) {
        console.error('Error updating truck:', error);
       showErrorModal('Error updating truck: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}
function createAdminTruckCard(truck) {
    const card = document.createElement('div');
    card.className = 'truck-card admin-card';
    
    const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
    
    const imageHtml = hasDriverImage ? 
        `<img src="${truck.driver_image_url}" alt="${truck.driver_name}" class="driver-image">` : '';
    
    card.innerHTML = `
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
            
            <div class="info-row">
                <span class="info-label">Contact:</span>
                <span class="info-value">${truck.driver_phone}</span>
                <div class="copy-call-buttons">
                    <button class="btn btn-copy" onclick="copyToClipboard('${truck.driver_phone}')">📋</button>
                    <button class="btn btn-call" onclick="callDriver('${truck.driver_phone}')">📞</button>
                </div>
            </div>
        </div>
        
        <div class="admin-card-actions">
            <button class="btn btn-copy" onclick="copyTruckDetails('${truck.truck_number}', '${truck.driver_name}', '${truck.driver_license}', '${truck.driver_phone}')">📋 Copy Details</button>
            <button class="btn btn-edit" onclick="openEditModal('${truck.id}')">✏️ Edit Details</button>
            <button class="btn btn-details" onclick="openAdminDetailsModal('${truck.id}')">ℹ️ View Details</button>
            <button class="btn btn-warning" onclick="confirmChangeStatus('${truck.id}', 'no_truck')">🚫 No Driver</button>
            <button class="btn btn-danger" onclick="confirmChangeStatus('${truck.id}', 'left')">👋 Driver Left</button>
        </div>
    `;
    
    return card;
}

// Copy individual field to clipboard
function copyToClipboard(text) {
    if (!text) {
        showNotification('No text to copy');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy to clipboard');
    });
}

// Call driver function
function callDriver(phone) {
    if (!phone) {
        showNotification('No phone number available');
        return;
    }
    
    if (confirm(`Call ${phone}?`)) {
        window.open(`tel:${phone}`, '_self');
    }
}

function copyTruckDetails(truckNumber, name, license, contacts) {
    const contactsText = Array.isArray(contacts) ? contacts.join('\n                 ') : contacts;
    const details = `Truck: ${truckNumber}\nName: ${name}\nLicense: ${license}\nContacts: ${contactsText}`;
    navigator.clipboard.writeText(details).then(() => {
        showNotification('All details copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy details');
    });
}
// Status badge helper
function getStatusBadge(status) {
    const statusMap = {
        'active': '<span class="status-badge status-active">Active</span>',
        'no_truck': '<span class="status-badge status-no-truck">No Truck</span>',
        'left': '<span class="status-badge status-left">Left</span>'
    };
    return statusMap[status] || '';
}
async function confirmChangeStatus(truckId, newStatus) {
    currentTruckId = truckId;
    pendingAction = newStatus;
    
    const messages = {
        'no_truck': 'Are you sure you want to mark this driver as having no truck? This will move the driver to "No Trucks" section and free up the truck.',
        'left': 'Are you sure you want to mark this driver as having left?'
    };
    
    document.getElementById('confirmTitle').textContent = 'Confirm Status Change';
    document.getElementById('confirmMessage').textContent = messages[newStatus] || 'Are you sure?';
    document.getElementById('confirmModal').style.display = 'block';
}



document.getElementById('confirmYes').onclick = async function() {
    if (!currentTruckId || !pendingAction) return;
    
    try {
        if (pendingAction === 'no_truck') {
            // Get the current truck data
            const { data: currentTruck, error: fetchError } = await supabase
                .from('trucks')
                .select('*')
                .eq('id', currentTruckId)
                .single();
            
            if (fetchError) throw fetchError;
            
            // Generate a unique truck number for the driver without truck
            const timestamp = Date.now();
            const uniqueTruckNumber = `NO-TRUCK-${timestamp}`;
            
            // Create a NEW record for the driver with no truck (for Drivers with No Trucks tab)
            const { data: newDriver, error: insertError } = await supabase
                .from('trucks')
                .insert({
                    truck_number: uniqueTruckNumber,
                    driver_name: currentTruck.driver_name,
                    driver_license: currentTruck.driver_license,
                    driver_phone: currentTruck.driver_phone,
                    driver_image_url: currentTruck.driver_image_url,
                    status: 'no_truck',
                    previous_trucks: currentTruck.truck_number,
                    // Don't copy truck specifications
                    truck_type: null,
                    truck_body: null,
                    truck_make: null,
                    truck_tons: null,
                    truck_image_url: null
                })
                .select();
            
            if (insertError) throw insertError;
            
            // Update the original truck to have NO DRIVER (but keep truck specs)
            const { error: updateError } = await supabase
                .from('trucks')
                .update({ 
                    driver_name: 'NO DRIVER',
                    driver_license: '',
                    driver_phone: '',
                    driver_image_url: null,
                    status: 'active' // Keep it active but with no driver
                })
                .eq('id', currentTruckId);
            
            if (updateError) throw updateError;
            
        } else if (pendingAction === 'left') {
            // Get the current truck data
            const { data: currentTruck, error: fetchError } = await supabase
                .from('trucks')
                .select('*')
                .eq('id', currentTruckId)
                .single();
            
            if (fetchError) throw fetchError;
            
            // Generate a unique truck number for the driver who left
            const timestamp = Date.now();
            const uniqueTruckNumber = `LEFT-${timestamp}`;
            
            // Create a NEW record for the driver who left (for Drivers Who Left tab)
            const { data: newDriver, error: insertError } = await supabase
                .from('trucks')
                .insert({
                    truck_number: uniqueTruckNumber,
                    driver_name: currentTruck.driver_name,
                    driver_license: currentTruck.driver_license,
                    driver_phone: currentTruck.driver_phone,
                    driver_image_url: currentTruck.driver_image_url,
                    status: 'left',
                    previous_trucks: currentTruck.truck_number,
                    // Don't copy truck specifications
                    truck_type: null,
                    truck_body: null,
                    truck_make: null,
                    truck_tons: null,
                    truck_image_url: null
                })
                .select();
            
            if (insertError) throw insertError;
            
            // Update the original truck to have NO DRIVER (but keep truck specs)
            const { error: updateError } = await supabase
                .from('trucks')
                .update({ 
                    driver_name: 'NO DRIVER',
                    driver_license: '',
                    driver_phone: '',
                    driver_image_url: null,
                    status: 'active' // Keep it active but with no driver
                })
                .eq('id', currentTruckId);
            
            if (updateError) throw updateError;
            
        } else if (pendingAction === 'move_to_left') {
            // NEW: Move driver from "No Trucks" to "Left" section
            // Get the current driver data from "No Trucks" section
            const { data: currentDriver, error: fetchError } = await supabase
                .from('trucks')
                .select('*')
                .eq('id', currentTruckId)
                .single();
            
            if (fetchError) throw fetchError;
            
            // Generate a unique truck number for the driver who left
            const timestamp = Date.now();
            const uniqueTruckNumber = `LEFT-${timestamp}`;
            
            // Create a NEW record for the driver who left (for Drivers Who Left tab)
            const { data: newDriver, error: insertError } = await supabase
                .from('trucks')
                .insert({
                    truck_number: uniqueTruckNumber,
                    driver_name: currentDriver.driver_name,
                    driver_license: currentDriver.driver_license,
                    driver_phone: currentDriver.driver_phone,
                    driver_image_url: currentDriver.driver_image_url,
                    status: 'left',
                    previous_trucks: currentDriver.previous_trucks || '',
                    // Don't copy truck specifications
                    truck_type: null,
                    truck_body: null,
                    truck_make: null,
                    truck_tons: null,
                    truck_image_url: null,
                    comesa: currentDriver.comesa || 'NO',
                    c28: currentDriver.c28 || 'NO',
                    comesa_expiry: currentDriver.comesa_expiry,
                    c28_expiry: currentDriver.c28_expiry
                })
                .select();
            
            if (insertError) throw insertError;
            
            // Delete the original record from "No Trucks" section
            const { error: deleteError } = await supabase
                .from('trucks')
                .delete()
                .eq('id', currentTruckId);
            
            if (deleteError) throw deleteError;
        }
        
        showSuccessModal('Status updated successfully!');
        document.getElementById('confirmModal').style.display = 'none';
        await updateLastUpdatedDate('truck-list');
        // Reload all tabs
        await loadTrucksByAdminStatus('all-trucks');
        await loadTrucksByAdminStatus('no-truck');
        await loadTrucksByAdminStatus('left');
        
    } catch (error) {
        console.error('Error updating status:', error);
        showErrorModal('Error updating status: ' + error.message);
    } finally {
        currentTruckId = null;
        pendingAction = null;
    }
};

// Move driver from "No Trucks" to "Left" section
async function moveDriverToLeft(truckId) {
    try {
        // Get the current driver data from "No Trucks" section
        const { data: currentDriver, error: fetchError } = await supabase
            .from('trucks')
            .select('*')
            .eq('id', truckId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Generate a unique truck number for the driver who left
        const timestamp = Date.now();
        const uniqueTruckNumber = `LEFT-${timestamp}`;
        
        // Create a NEW record for the driver who left (for Drivers Who Left tab)
        const { data: newDriver, error: insertError } = await supabase
            .from('trucks')
            .insert({
                truck_number: uniqueTruckNumber,
                driver_name: currentDriver.driver_name,
                driver_license: currentDriver.driver_license,
                driver_phone: currentDriver.driver_phone,
                driver_image_url: currentDriver.driver_image_url,
                status: 'left',
                previous_trucks: currentDriver.previous_trucks || '',
                // Don't copy truck specifications
                truck_type: null,
                truck_body: null,
                truck_make: null,
                truck_tons: null,
                truck_image_url: null,
                comesa: currentDriver.comesa || 'NO',
                c28: currentDriver.c28 || 'NO',
                comesa_expiry: currentDriver.comesa_expiry,
                c28_expiry: currentDriver.c28_expiry
            })
            .select();
        
        if (insertError) throw insertError;
        
        // Delete the original record from "No Trucks" section
        const { error: deleteError } = await supabase
            .from('trucks')
            .delete()
            .eq('id', truckId);
        
        if (deleteError) throw deleteError;
        
    } catch (error) {
        console.error('Error moving driver to left:', error);
        throw error;
    }
}
function createActiveDriverCard(truck, index) {
    const card = document.createElement('div');
    card.className = 'truck-card admin-card';
    
    const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
    
    const imageHtml = hasDriverImage ? 
        `<img src="${truck.driver_image_url}" alt="${truck.driver_name}" class="driver-image">` : '';
    
    // Generate contacts HTML
    const contactsHtml = generateContactsHtml(truck.driver_contacts);
    
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
        
        <div class="admin-card-actions">
            <button class="btn btn-copy" onclick="copyTruckDetails('${truck.truck_number}', '${truck.driver_name}', '${truck.driver_license}', getContactsText('${truck.id}'))">📋 Copy Details</button>
            <button class="btn btn-edit" onclick="openEditModal('${truck.id}')">✏️ Edit Details</button>
            <button class="btn btn-details" onclick="openAdminDetailsModal('${truck.id}')">ℹ️ View Details</button>
            <button class="btn btn-warning" onclick="confirmChangeStatus('${truck.id}', 'no_truck')">🚫 No Driver</button>
            <button class="btn btn-danger" onclick="confirmChangeStatus('${truck.id}', 'left')">👋 Driver Left</button>
            <!-- NEW: Delete Button -->
            <button class="btn btn-delete" onclick="confirmDeleteTruck('${truck.id}', '${truck.truck_number}', '${truck.driver_name}')">🗑️ Delete</button>
        </div>
    `;
    
    return card;
}
function createNoDriverCard(truck, index) {
    const card = document.createElement('div');
    card.className = 'truck-card admin-card no-driver-card';
    
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
                <span class="info-label">Contacts:</span>
                <span class="info-value empty-field">-</span>
            </div>
        </div>
        
        <div class="admin-card-actions">
            <button class="btn btn-copy" onclick="copyTruckDetails('${truck.truck_number}', 'NO DRIVER', '', '')">📋 Copy Details</button>
            <button class="btn btn-edit" onclick="openEditModal('${truck.id}')">✏️ Edit Details</button>
            <button class="btn btn-details" onclick="openNoDriverDetailsModal('${truck.id}')">ℹ️ View Details</button>
            <!-- NEW: Delete Button -->
            <button class="btn btn-delete" onclick="confirmDeleteTruck('${truck.id}', '${truck.truck_number}', 'NO DRIVER')">🗑️ Delete</button>
        </div>
    `;
    
    return card;
}

function createDriverNoTruckCard(truck, index) {
    const card = document.createElement('div');
    card.className = 'truck-card admin-card driver-no-truck-card';
    
    const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
    
    const imageHtml = hasDriverImage ? 
        `<img src="${truck.driver_image_url}" alt="${truck.driver_name}" class="driver-image">` : '';
    
    const previousTrucksText = truck.previous_trucks || 'No previous trucks';
    
    // Generate contacts HTML
    const contactsHtml = generateContactsHtml(truck.driver_contacts);
    
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
            
            <div class="info-row">
                <span class="info-label">Previous Truck:</span>
                <span class="info-value">${previousTrucksText}</span>
            </div>
        </div>
        
        <div class="admin-card-actions">
            <button class="btn btn-copy" onclick="copyTruckDetails('NO ASSIGNED TRUCK', '${truck.driver_name}', '${truck.driver_license}', getContactsText('${truck.id}'))">📋 Copy Details</button>
            <button class="btn btn-edit" onclick="openEditDriverModal('${truck.id}')">✏️ Edit Details</button>
            <button class="btn btn-details" onclick="openDriverNoTruckDetailsModal('${truck.id}')">ℹ️ View Details</button>
            <button class="btn btn-primary" onclick="openAssignTruckModal('${truck.id}')">🚛 Assign Truck</button>
            <button class="btn btn-danger" onclick="confirmMoveToLeft('${truck.id}')">👋 Driver Left</button>
            <!-- NEW: Delete Button -->
            <button class="btn btn-delete" onclick="confirmDeleteTruck('${truck.id}', 'NO ASSIGNED TRUCK', '${truck.driver_name}')">🗑️ Delete</button>
        </div>
    `;
    
    return card;
}
function createDriverLeftCard(truck, index) {
    const card = document.createElement('div');
    card.className = 'truck-card admin-card driver-left-card';
    
    const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
    
    const imageHtml = hasDriverImage ? 
        `<img src="${truck.driver_image_url}" alt="${truck.driver_name}" class="driver-image">` : '';
    
    const previousTrucksText = truck.previous_trucks || 'No previous trucks';
    
    // Generate contacts HTML
    const contactsHtml = generateContactsHtml(truck.driver_contacts);
    
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
            
            <div class="info-row">
                <span class="info-label">Previous Truck:</span>
                <span class="info-value">${previousTrucksText}</span>
            </div>
        </div>
        
        <div class="admin-card-actions">
            <button class="btn btn-copy" onclick="copyTruckDetails('LEFT COMPANY', '${truck.driver_name}', '${truck.driver_license}', getContactsText('${truck.id}'))">📋 Copy Details</button>
            <button class="btn btn-edit" onclick="openEditDriverModal('${truck.id}')">✏️ Edit Details</button>
            <button class="btn btn-details" onclick="openDriverLeftDetailsModal('${truck.id}')">ℹ️ View Details</button>
            <button class="btn btn-primary" onclick="openReactivateModal('${truck.id}', '${truck.driver_name}')">↩️ Reactivate Driver</button>
            <!-- NEW: Delete Button -->
            <button class="btn btn-delete" onclick="confirmDeleteTruck('${truck.id}', 'LEFT COMPANY', '${truck.driver_name}')">🗑️ Delete</button>
        </div>
    `;
    
    return card;
}

// NEW FUNCTION: Confirm truck deletion
function confirmDeleteTruck(truckId, truckNumber, driverName) {
    currentTruckId = truckId;
    
    const modal = document.getElementById('deleteConfirmModal');
    const message = document.getElementById('deleteConfirmMessage');
    
    message.innerHTML = `
        <strong>🚨 WARNING: This action cannot be undone!</strong><br><br>
        Are you sure you want to permanently delete:<br>
        <strong>Truck:</strong> ${truckNumber}<br>
        <strong>Driver:</strong> ${driverName}<br><br>
        This will remove all associated data including contacts and images from the database.
    `;
    
    modal.style.display = 'block';
}

// NEW FUNCTION: Handle truck deletion
async function handleDeleteTruck() {
    if (!currentTruckId) return;
    
    const submitBtn = document.getElementById('deleteConfirmYes');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Deleting...';
    submitBtn.disabled = true;
    
    try {
        // First, delete associated contacts
        const { error: contactsError } = await supabase
            .from('driver_contacts')
            .delete()
            .eq('truck_id', currentTruckId);
        
        if (contactsError) throw contactsError;
        
        // Delete associated additional fields
        const { error: fieldsError } = await supabase
            .from('truck_additional_fields')
            .delete()
            .eq('truck_id', currentTruckId);
        
        if (fieldsError) throw fieldsError;
        
        // Delete associated additional images
        const { error: imagesError } = await supabase
            .from('truck_additional_images')
            .delete()
            .eq('truck_id', currentTruckId);
        
        if (imagesError) throw imagesError;
        
        // Finally, delete the truck record
        const { error: truckError } = await supabase
            .from('trucks')
            .delete()
            .eq('id', currentTruckId);
        
        if (truckError) throw truckError;
        
       showSuccessModal('Truck deleted successfully!');
        document.getElementById('deleteConfirmModal').style.display = 'none';
        
        // UPDATE LAST UPDATED DATE
        await updateLastUpdatedDate('truck-list');
        
        // Reload all sections to reflect changes
        await loadTrucksByAdminStatus('all-trucks');
        await loadTrucksByAdminStatus('no-truck');
        await loadTrucksByAdminStatus('left');
        
    } catch (error) {
        console.error('Error deleting truck:', error);
        showErrorModal('Error deleting truck: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        currentTruckId = null;
    }
}
let currentTrucksData = {
    'all-trucks': [],
    'no-truck': [],
    'left': []
};


document.getElementById('confirmNo').onclick = function() {
    document.getElementById('confirmModal').style.display = 'none';
    currentTruckId = null;
    pendingAction = null;
};

// Save additional fields to database
async function saveAdditionalFields() {
    try {
        const truckId = currentTruckId;
        const fieldElements = document.querySelectorAll('#dynamicFieldsContainer .dynamic-field-item');
        
        // Delete all existing additional fields for this truck
        const { error: deleteError } = await supabase
            .from('truck_additional_fields')
            .delete()
            .eq('truck_id', truckId);
        
        if (deleteError) throw deleteError;
        
        // Insert new additional fields
        const fieldsToInsert = [];
        
        fieldElements.forEach(element => {
            const fieldId = element.getAttribute('data-field-id');
            const fieldKey = element.getAttribute('data-field-key');
            const labelInput = element.querySelector('input[placeholder="Field Label"]');
            const valueInput = element.querySelector('input[placeholder="Field Value"]');
            
            if (labelInput && valueInput && labelInput.value && valueInput.value) {
                fieldsToInsert.push({
                    truck_id: truckId,
                    field_key: fieldKey,
                    field_label: labelInput.value,
                    field_value: valueInput.value
                });
            }
        });
        
        if (fieldsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('truck_additional_fields')
                .insert(fieldsToInsert);
            
            if (insertError) throw insertError;
        }
        
    } catch (error) {
        console.error('Error saving additional fields:', error);
        throw error;
    }
}

// UPDATED: Setup modals function with confirmation modal
function setupModals() {
    // Edit Modal
    const editModal = document.getElementById('editModal');
    const editCloseBtn = editModal.querySelector('.close');
    const editForm = document.getElementById('editForm');

    editCloseBtn.onclick = () => {
        editModal.style.display = 'none';
        resetFileInputs('edit');
        resetModalState('edit');
    };
    
    editForm.onsubmit = handleEditFormSubmit;

    // Add Modal
    const addModal = document.getElementById('addModal');
    const addCloseBtn = addModal.querySelector('.close');
    const addForm = document.getElementById('addForm');

    addCloseBtn.onclick = () => {
        addModal.style.display = 'none';
        resetFileInputs('add');
        resetModalState('add');
    };
    
    addForm.onsubmit = handleAddFormSubmit;

    // Confirmation Modal
    const confirmModal = document.getElementById('confirmModal');
    const confirmCloseBtn = confirmModal.querySelector('.close');
    const confirmNoBtn = document.getElementById('confirmNo');

    confirmCloseBtn.onclick = () => {
        confirmModal.style.display = 'none';
        currentTruckId = null;
        pendingAction = null;
    };
    
    confirmNoBtn.onclick = () => {
        confirmModal.style.display = 'none';
        currentTruckId = null;
        pendingAction = null;
    };

    // Delete Confirmation Modal
    const deleteModal = document.getElementById('deleteConfirmModal');
    if (deleteModal) {
        const deleteCloseBtn = deleteModal.querySelector('.close');
        const deleteNoBtn = deleteModal.querySelector('.btn-back');

        deleteCloseBtn.onclick = () => {
            deleteModal.style.display = 'none';
            currentTruckId = null;
        };
        
        deleteNoBtn.onclick = () => {
            deleteModal.style.display = 'none';
            currentTruckId = null;
        };
    }

    // Reactivate Modal
    const reactivateModal = document.getElementById('reactivateModal');
    if (reactivateModal) {
        const reactivateCloseBtn = reactivateModal.querySelector('.close');
        const reactivateNoBtn = document.getElementById('reactivateNo');

        reactivateCloseBtn.onclick = () => {
            reactivateModal.style.display = 'none';
            driverToReactivate = null;
        };
        
        reactivateNoBtn.onclick = () => {
            reactivateModal.style.display = 'none';
            driverToReactivate = null;
        };
    }

    // Assign Truck Modals
    setupAssignTruckModals();

    // Close modals when clicking outside
    window.onclick = (event) => {
        if (event.target === editModal) {
            editModal.style.display = 'none';
            resetFileInputs('edit');
            resetModalState('edit');
        }
        if (event.target === addModal) {
            addModal.style.display = 'none';
            resetFileInputs('add');
            resetModalState('add');
        }
        if (event.target === confirmModal) {
            confirmModal.style.display = 'none';
            currentTruckId = null;
            pendingAction = null;
        }
        if (deleteModal && event.target === deleteModal) {
            deleteModal.style.display = 'none';
            currentTruckId = null;
        }
        if (reactivateModal && event.target === reactivateModal) {
            reactivateModal.style.display = 'none';
            driverToReactivate = null;
        }
    };

    // Edit Driver Modal
    const editDriverModal = document.getElementById('editDriverModal');
    const editDriverCloseBtn = editDriverModal.querySelector('.close');
    const editDriverForm = document.getElementById('editDriverForm');

    editDriverCloseBtn.onclick = () => {
        editDriverModal.style.display = 'none';
    };
    
    editDriverForm.onsubmit = handleEditDriverSubmit;

    // Close modal when clicking outside
    window.onclick = (event) => {
        // ... your existing code ...
        if (event.target === editDriverModal) {
            editDriverModal.style.display = 'none';
        }
    };
 const addDriverModal = document.getElementById('addDriverModal');
    if (addDriverModal) {
        const addDriverCloseBtn = addDriverModal.querySelector('.close');
        const addDriverForm = document.getElementById('addDriverForm');
        
        addDriverCloseBtn.onclick = () => {
            addDriverModal.style.display = 'none';
        };
        
        addDriverForm.onsubmit = handleAddDriverSubmit;
        
        // Close when clicking outside
        window.onclick = (event) => {
            if (event.target === addDriverModal) {
                addDriverModal.style.display = 'none';
            }
        };
    }
    
    setupReactivateModal();
    setupAssignTruckModals();
}
async function handleAddFormSubmit(event) {
    event.preventDefault();
    
    // Check if No Driver mode is active
    const noDriverMode = document.getElementById('noDriverBtn').classList.contains('active');
    
    // Validate form
    const validationErrors = validateTruckForm('add', noDriverMode);
    if (validationErrors.length > 0) {
        alert('❌ Please fix the following errors:\n\n' + validationErrors.join('\n'));
        return;
    }
    
    const truckNumber = document.getElementById('addTruckNumber').value;
    const driverName = noDriverMode ? 'NO DRIVER' : document.getElementById('addDriverName').value;
    const driverLicense = noDriverMode ? '' : document.getElementById('addDriverLicense').value;
    const driverLicenseUrl = noDriverMode ? '' : document.getElementById('addDriverLicenseUrl').value;
    const truckType = document.getElementById('addTruckType').value;
    const truckBody = document.getElementById('addTruckBody').value;
    const truckMake = document.getElementById('addTruckMake').value;
    const truckTons = document.getElementById('addTruckTons').value;
    const comesa = document.getElementById('addComesa').value;
    const c28 = document.getElementById('addC28').value;
    const addComesaExpiryInput = document.getElementById('addComesaExpiry');
    const addC28ExpiryInput = document.getElementById('addC28Expiry');
    const comesaExpiry = addComesaExpiryInput ? addComesaExpiryInput.value || null : null;
    const c28Expiry = addC28ExpiryInput ? addC28ExpiryInput.value || null : null;
    const driverImageFile = noDriverMode ? null : document.getElementById('addDriverImage').files[0];
    const truckImageFile = document.getElementById('addTruckImage').files[0];
    
    // Get contacts from add form (empty array in No Driver mode)
    const contacts = noDriverMode ? [] : getContactsFromForm('add');
    if (!noDriverMode && contacts.length === 0) {
        alert('Please add at least one contact number');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Adding...';
    submitBtn.disabled = true;
    
    try {
        let driverImageUrl = null;
        let truckImageUrl = null;
        
        // Upload driver image if selected and not in No Driver mode
        if (driverImageFile && !noDriverMode) {
            const fileExt = driverImageFile.name.split('.').pop();
            const fileName = `driver-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('driver-images')
                .upload(fileName, driverImageFile, {
                    upsert: true,
                    cacheControl: '3600'
                });
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
                .from('driver-images')
                .getPublicUrl(fileName);
            
            driverImageUrl = urlData.publicUrl;
        }
        
        // Upload truck image
        if (truckImageFile) {
            const fileExt = truckImageFile.name.split('.').pop();
            const fileName = `truck-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('driver-images')
                .upload(fileName, truckImageFile, {
                    upsert: true,
                    cacheControl: '3600'
                });
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
                .from('driver-images')
                .getPublicUrl(fileName);
            
            truckImageUrl = urlData.publicUrl;
        }
        
        // Get dynamic fields data
        const dynamicFieldsData = {};
        const fieldElements = document.querySelectorAll('#addDynamicFieldsContainer .dynamic-field-item');
        fieldElements.forEach(element => {
            const fieldKey = element.getAttribute('data-field-key');
            const valueInput = element.querySelector('input[placeholder="Field Value"]');
            if (valueInput && valueInput.value) {
                dynamicFieldsData[fieldKey] = valueInput.value;
            }
        });
        
        // Insert new truck record with dynamic fields
        const truckData = {
            truck_number: truckNumber,
            driver_name: driverName,
            driver_license: driverLicense,
            driver_license_url: driverLicenseUrl,
            driver_image_url: driverImageUrl,
            truck_type: truckType,
            truck_body: truckBody,
            truck_make: truckMake,
            truck_tons: truckTons,
            comesa: comesa,
            c28: c28,
            comesa_expiry: comesaExpiry,
            c28_expiry: c28Expiry,
            truck_image_url: truckImageUrl,
            ...dynamicFieldsData
        };
        
        const { data: newTruck, error: insertError } = await supabase
            .from('trucks')
            .insert(truckData)
            .select()
            .single();
        
        if (insertError) throw insertError;
        
        // Insert contacts only if not in No Driver mode
        if (!noDriverMode && contacts.length > 0) {
            const contactsToInsert = contacts.map(contact => ({
                truck_id: newTruck.id,
                phone_number: contact.phone,
                contact_type: contact.type
            }));
            
            const { error: contactsError } = await supabase
                .from('driver_contacts')
                .insert(contactsToInsert);
            
            if (contactsError) throw contactsError;
        }
        
        // Save additional images for add modal
        await saveAdditionalImages('add', newTruck.id);
        
        showSuccessModal('Truck added successfully!');
        document.getElementById('addModal').style.display = 'none';
        document.getElementById('addForm').reset();
        resetFileInputs('add');
        resetModalState('add');
        
        // Reset No Driver mode
        const noDriverBtn = document.getElementById('noDriverBtn');
        if (noDriverBtn.classList.contains('active')) {
            noDriverBtn.classList.remove('active');
            noDriverBtn.innerHTML = '🚫 No Driver';
            enableDriverFields();
        }
        
        // Reset contacts container
        document.getElementById('addContactsContainer').innerHTML = '';
        if (!noDriverMode) {
            addContactField('add'); // Add one empty contact field
        }
        
        await updateLastUpdatedDate('truck-list');
        loadTrucks();
        
    } catch (error) {
        console.error('Error adding truck:', error);
        showErrorModal('Error adding truck: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}
// UPDATED: Save additional images to handle both modals
async function saveAdditionalImages(modalType, truckId) {
    try {
        const imageElements = document.querySelectorAll(`#${modalType}AdditionalImagesContainer .additional-image-item`);
        
        if (imageElements.length === 0) return;
        
        // Insert new additional images
        const imagesToInsert = [];
        
        imageElements.forEach(element => {
            const imageId = element.getAttribute('data-image-id');
            const descriptionElement = element.querySelector('.additional-image-info p');
            const description = descriptionElement ? descriptionElement.textContent.replace('Description: ', '') : '';
            const imageUrl = element.querySelector('.additional-image-preview').src;
            
            // Only save new images
            if (imageId.startsWith('new_')) {
                imagesToInsert.push({
                    truck_id: truckId,
                    image_url: imageUrl,
                    description: description
                });
            }
        });
        
        if (imagesToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('truck_additional_images')
                .insert(imagesToInsert);
            
            if (insertError) throw insertError;
        }
        
    } catch (error) {
        console.error('Error saving additional images:', error);
        throw error;
    }
}

// Update field label
function updateFieldLabel(fieldId, newLabel) {
    const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (fieldElement) {
        fieldElement.setAttribute('data-field-key', newLabel.toLowerCase().replace(/ /g, '_'));
    }
}

// Update field value
function updateFieldValue(fieldId, newValue) {
    // Values are saved when form is submitted
}

// Remove field
function removeField(fieldId) {
    const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (fieldElement) {
        fieldElement.remove();
    }
}

// Remove additional image
async function removeAdditionalImage(imageId) {
    if (!imageId.startsWith('new_')) {
        // Delete from database if it's not a new image
        try {
            const { error } = await supabase
                .from('truck_additional_images')
                .delete()
                .eq('id', imageId);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting image:', error);
            alert('Error deleting image from database');
        }
    }
    
    // Remove from UI
    const imageElement = document.querySelector(`[data-image-id="${imageId}"]`);
    if (imageElement) {
        imageElement.remove();
    }
}

// Admin Filter state
let adminActiveFilters = {
    no_driver: false,
    comesa: false,
    c28: false
};

// Toggle admin dropdown
function toggleAdminFilterDropdown() {
    const dropdown = document.querySelector('#adminFilterContainer .filter-dropdown');
    dropdown.classList.toggle('active');
}

// Close admin dropdown when clicking outside
document.addEventListener('click', function(event) {
    const filterContainer = document.getElementById('adminFilterContainer');
    const dropdown = document.querySelector('#adminFilterContainer .filter-dropdown');
    
    if (filterContainer && filterContainer.style.display !== 'none' && 
        !filterContainer.contains(event.target) && 
        dropdown.classList.contains('active')) {
        dropdown.classList.remove('active');
    }
});

// Toggle individual admin filter
function toggleAdminFilter(filterType) {
    adminActiveFilters[filterType] = !adminActiveFilters[filterType];
    updateAdminFilterUI();
    applyAdminFiltersToCurrentTab();
    
    // Update the option visual state
    const option = event.target.closest('.filter-option');
    if (adminActiveFilters[filterType]) {
        option.classList.add('active');
    } else {
        option.classList.remove('active');
    }
}

// Update admin filter UI
function updateAdminFilterUI() {
    const activeCount = Object.values(adminActiveFilters).filter(Boolean).length;
    const activeFilterCount = document.getElementById('adminActiveFilterCount');
    const filterStatus = document.getElementById('adminFilterStatus');
    
    if (activeFilterCount) {
        activeFilterCount.textContent = activeCount;
    }
    
    if (filterStatus) {
        if (activeCount === 0) {
            filterStatus.textContent = 'All';
        } else if (activeCount === 1) {
            // Show which single filter is active
            const activeFilter = Object.keys(adminActiveFilters).find(key => adminActiveFilters[key]);
            filterStatus.textContent = getAdminFilterDisplayName(activeFilter);
        } else {
            filterStatus.textContent = `${activeCount} active`;
        }
    }
    
    // Update individual option states
    Object.keys(adminActiveFilters).forEach(filterType => {
        const option = document.querySelector(`[onclick="toggleAdminFilter('${filterType}')"]`);
        if (option) {
            if (adminActiveFilters[filterType]) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        }
    });
}

// Get display name for admin filters
function getAdminFilterDisplayName(filterType) {
    const names = {
        'no_driver': 'No Driver',
        'comesa': 'COMESA',
        'c28': 'C28'
    };
    return names[filterType] || filterType;
}

// Clear all admin filters
function clearAllAdminFilters() {
    // Reset to original state
    adminActiveFilters.no_driver = false;
    adminActiveFilters.comesa = false;
    adminActiveFilters.c28 = false;
    
    // Remove active classes from all options
    const adminFilterContainer = document.getElementById('adminFilterContainer');
    if (adminFilterContainer) {
        adminFilterContainer.querySelectorAll('.filter-option').forEach(option => {
            option.classList.remove('active');
        });
    }
    
    updateAdminFilterUI();
    applyAdminFiltersToCurrentTab();
    
    // Close dropdown after clearing
    const dropdown = document.querySelector('#adminFilterContainer .filter-dropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

// Apply filters to admin data
function applyAdminFiltersToData(trucks, containerId) {
    if (!trucks || trucks.length === 0) return;
    
    let filteredTrucks = trucks;
    
    // Get active filter types
    const activeFilterTypes = Object.keys(adminActiveFilters).filter(key => adminActiveFilters[key]);
    
    if (activeFilterTypes.length > 0) {
        filteredTrucks = trucks.filter(truck => {
            // Check if both COMESA and C28 filters are active
            const bothFiltersActive = adminActiveFilters.comesa && adminActiveFilters.c28;
            
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
    displayTrucksInAdminContainer(filteredTrucks, containerId);
    
    // Update results count
    const resultsCount = document.getElementById('searchResultsCount');
    if (resultsCount) {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        if (searchTerm === '') {
            resultsCount.textContent = `Showing ${filteredTrucks.length} of ${trucks.length} items`;
        }
    }
}

// Apply filters to current admin tab
function applyAdminFiltersToCurrentTab() {
    const activeAdminTab = document.querySelector('.admin-tab-content.active').id;
    const currentData = currentTrucksData[activeAdminTab];
    
    if (!currentData || currentData.length === 0) {
        loadTrucksByAdminStatus(activeAdminTab);
        return;
    }
    
    const containerMap = {
        'all-trucks': 'trucks-list',
        'no-truck': 'no-truck-list',
        'left': 'left-list'
    };
    
    const containerId = containerMap[activeAdminTab];
    
    // Only apply filters if we're on the All Drivers/Trucks tab
    if (activeAdminTab === 'all-trucks') {
        applyAdminFiltersToData(currentData, containerId);
    } else {
        // For other tabs, just display the data with fresh numbering
        displayTrucksInAdminContainer(currentData, containerId);
        
        // Clear results count
        const resultsCount = document.getElementById('searchResultsCount');
        if (resultsCount) {
            resultsCount.textContent = '';
        }
    }
}

// UPDATED: Open tab function with sub-tab preservation
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
        // RESTORE the active admin sub-tab when returning to truck list
        restoreActiveAdminSubTab();
    }
    
    // Display last updated date for the active tab
    displayLastUpdatedDate(tabName);
}

// NEW FUNCTION: Restore active admin sub-tab
function restoreActiveAdminSubTab() {
    // Check if we have a stored active sub-tab, otherwise default to 'all-trucks'
    const activeSubTab = currentAdminTab || 'all-trucks';
    
    // Update the UI to show the correct active sub-tab
    document.querySelectorAll('.secondary-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Activate the stored sub-tab
    const activeTabElement = document.querySelector(`[onclick="openAdminTab('${activeSubTab}')"]`);
    const activeContent = document.getElementById(activeSubTab);
    
    if (activeTabElement && activeContent) {
        activeTabElement.classList.add('active');
        activeContent.classList.add('active');
        
        // Load the data for this sub-tab
        loadTrucksByAdminStatus(activeSubTab);
        
        // Update filter container visibility
        updateAdminFilterVisibility(activeSubTab);
    }
}

// UPDATED: Update filter visibility function
function updateAdminFilterVisibility(activeSubTab) {
    const filterContainer = document.getElementById('adminFilterContainer');
    if (filterContainer) {
        if (activeSubTab === 'all-trucks') {
            filterContainer.style.display = 'block';
        } else {
            filterContainer.style.display = 'none';
        }
    }
}

// UPDATED: openAdminTab function to store the current sub-tab
function openAdminTab(tabName) {
    currentAdminTab = tabName; // STORE the current sub-tab
    
    // Update active tab
    document.querySelectorAll('.secondary-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Show active content
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Update filter container visibility
    updateAdminFilterVisibility(tabName);

    // Load appropriate data
    loadTrucksByAdminStatus(tabName);
}

// Update admin search to handle filters and re-number results
function handleAdminSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const resultsCount = document.getElementById('searchResultsCount');
    const activeAdminTab = document.querySelector('.admin-tab-content.active').id;
    
    if (searchTerm === '') {
        loadTrucksByAdminStatus(activeAdminTab);
        return;
    }
    
    const currentData = currentTrucksData[activeAdminTab];
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
    if (activeAdminTab === 'all-trucks') {
        const activeFilterTypes = Object.keys(adminActiveFilters).filter(key => adminActiveFilters[key]);
        if (activeFilterTypes.length > 0) {
            // Check if both COMESA and C28 filters are active
            const bothFiltersActive = adminActiveFilters.comesa && adminActiveFilters.c28;
            
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
    
    const containerId = containerMap[activeAdminTab];
    
    // Display with fresh numbering starting from 1
    displayTrucksInAdminContainer(filteredTrucks, containerId);
    
    if (resultsCount) {
        resultsCount.textContent = `Found ${filteredTrucks.length} of ${currentData.length} items`;
    }
}

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

// UPDATED: Add contact field (with proper button visibility)
function addContactField(modalType = 'add', phone = '', contactId = null) {
    const containerId = modalType === 'add' ? 'addContactsContainer' : 'editContactsContainer';
    const container = document.getElementById(containerId);
    
    const contactGroup = document.createElement('div');
    contactGroup.className = 'contact-input-group';
    contactGroup.setAttribute('data-contact-id', contactId || `new_${Date.now()}`);
    
    // Check if we're in No Driver mode
    const isNoDriverMode = modalType === 'add' && document.getElementById('noDriverBtn')?.classList.contains('active');
    const isReadonly = isNoDriverMode;
    const placeholder = isNoDriverMode ? 'No driver - field disabled' : '';
    
    contactGroup.innerHTML = `
        <input type="text" class="contact-input" placeholder="${placeholder}" 
               value="${phone}" ${isReadonly ? 'readonly' : ''} 
               style="${isReadonly ? 'background-color: #f8f9fa; cursor: not-allowed;' : ''}">
        <button type="button" class="btn-remove-contact" onclick="removeContactField(this)">🗑️</button>
    `;
    
    container.appendChild(contactGroup);
    
    // Update remove buttons visibility - ALWAYS show them
    updateContactRemoveButtons(containerId);
}
// UPDATED: Add contact field to form (with proper button visibility)
function addContactFieldToForm(modalType, phone = '', contactId = null) {
    const containerId = modalType === 'add' ? 'addContactsContainer' : 'editContactsContainer';
    const container = document.getElementById(containerId);
    
    const contactGroup = document.createElement('div');
    contactGroup.className = 'contact-input-group';
    if (contactId) {
        contactGroup.setAttribute('data-contact-id', contactId);
    } else {
        contactGroup.setAttribute('data-contact-id', `new_${Date.now()}`);
    }
    
    contactGroup.innerHTML = `
        <input type="text" class="contact-input"  value="${phone}" ${!contactId ? 'required' : ''}>
        <button type="button" class="btn-remove-contact" onclick="removeContactField(this)">🗑️</button>
    `;
    
    container.appendChild(contactGroup);
    updateContactRemoveButtons(containerId);
}
// UPDATED: Load driver contacts (ensure dustbin icons are visible)
async function loadDriverContacts(truckId) {
    const container = document.getElementById('editContactsContainer');
    container.innerHTML = '';
    
    try {
        const { data: contacts, error } = await supabase
            .from('driver_contacts')
            .select('*')
            .eq('truck_id', truckId)
            .order('created_at');
        
        if (error) throw error;
        
        if (contacts && contacts.length > 0) {
            contacts.forEach(contact => {
                addContactFieldToForm('edit', contact.phone_number, contact.id);
            });
        } else {
            // Add one empty contact field
            addContactFieldToForm('edit');
        }
        
        // Ensure dustbin icons are visible
        updateContactRemoveButtons('editContactsContainer');
        
    } catch (error) {
        console.error('Error loading contacts:', error);
        // Add one empty contact field as fallback
        addContactFieldToForm('edit');
        updateContactRemoveButtons('editContactsContainer');
    }
}

function getContactsFromForm(modalType) {
    const containerId = modalType === 'add' ? 'addContactsContainer' : 'editContactsContainer';
    const container = document.getElementById(containerId);
    const contactGroups = container.querySelectorAll('.contact-input-group');
    
    const contacts = [];
    contactGroups.forEach(group => {
        const phoneInput = group.querySelector('.contact-input');
        const contactId = group.getAttribute('data-contact-id');
        
        if (phoneInput.value.trim()) {
            contacts.push({
                id: contactId,
                phone: phoneInput.value.trim()
            });
        }
    });
    
    return contacts;
}

// UPDATED: Remove contact field (prevent removing the last field)
function removeContactField(button) {
    const contactGroup = button.closest('.contact-input-group');
    const container = contactGroup.parentElement;
    const contactGroups = container.querySelectorAll('.contact-input-group');
    
    // If this is NOT the last contact field, remove it
    if (contactGroups.length > 1) {
        const contactId = contactGroup.getAttribute('data-contact-id');
        
        // If it's an existing contact (not new), mark it for deletion
        if (contactId && !contactId.startsWith('new_')) {
            if (!window.contactsToDelete) {
                window.contactsToDelete = [];
            }
            window.contactsToDelete.push(contactId);
        }
        
        contactGroup.remove();
    } else {
        // If this is the last contact field, just clear the input instead of removing
        const contactInput = contactGroup.querySelector('.contact-input');
        contactInput.value = '';
        contactInput.placeholder = '';
        contactInput.focus();
    }
    
    // Update remove buttons visibility
    const containerId = container.id;
    updateContactRemoveButtons(containerId);
}

function updateContactRemoveButtons(containerId) {
    const container = document.getElementById(containerId);
    const contactGroups = container.querySelectorAll('.contact-input-group');
    const removeButtons = container.querySelectorAll('.btn-remove-contact');
    
    // Show remove buttons only if there's more than one contact
    if (contactGroups.length > 1) {
        removeButtons.forEach(btn => btn.style.display = 'inline-block');
    } else {
        removeButtons.forEach(btn => btn.style.display = 'none');
    }
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
function copyTruckDetails(truckNumber, name, license, contacts) {
    const details = `Truck: ${truckNumber}\nName: ${name}\nLicense: ${license}\n${contacts}`;
    navigator.clipboard.writeText(details).then(() => {
        showNotification('All details copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy details');
    });
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

function getContactsText(truckId) {
    // This function gets the contacts as a formatted string for copying
    // Find the truck in any of the current data arrays
    let truck = null;
    
    // Check all tabs for the truck
    for (const tab in currentTrucksData) {
        if (currentTrucksData[tab]) {
            truck = currentTrucksData[tab].find(t => t.id === truckId);
            if (truck) break;
        }
    }
    
    if (!truck || !truck.driver_contacts || truck.driver_contacts.length === 0) {
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


// Function to get last updated date for a tab
async function getLastUpdatedDate(tabName) {
    try {
        const { data, error } = await supabase
            .from('last_updated_dates')
            .select('last_updated')
            .eq('tab_name', tabName)
            .single();
        
        if (error) throw error;
        
        return data ? data.last_updated : new Date().toISOString();
    } catch (error) {
        console.error('Error fetching last updated date:', error);
        return new Date().toISOString();
    }
}

// UPDATED: Function to update last updated date for a tab
async function updateLastUpdatedDate(tabName) {
    try {
        // Use local time instead of server time
        const now = new Date();
        const localISOTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();
        
        const { error } = await supabase
            .from('last_updated_dates')
            .upsert({
                tab_name: tabName,
                last_updated: localISOTime
            }, {
                onConflict: 'tab_name' // Specify the conflict target
            });
        
        if (error) throw error;
        
        // Update the display immediately
        displayLastUpdatedDate(tabName);
    } catch (error) {
        console.error('Error updating last updated date:', error);
        // Don't show error modal for this as it's not critical for user
    }
}

// Function to display last updated date
async function displayLastUpdatedDate(tabName) {
    const date = await getLastUpdatedDate(tabName);
    const formattedDate = formatLastUpdatedDate(date);
    
    const container = document.getElementById(`last-updated-${tabName}`);
    if (container) {
        container.innerHTML = `<small class="last-updated-text">Last updated: ${formattedDate}</small>`;
    }
}

// Format date as "06th Nov 2025" using local time
function formatLastUpdatedDate(dateString) {
    const date = new Date(dateString);
    
    // Convert to local timezone
    const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    
    const day = localDate.getDate();
    const month = localDate.toLocaleString('en-US', { month: 'short' });
    const year = localDate.getFullYear();
    
    // Add ordinal suffix to day
    const dayWithSuffix = day + (day % 10 === 1 && day !== 11 ? 'st' : 
                                day % 10 === 2 && day !== 12 ? 'nd' : 
                                day % 10 === 3 && day !== 13 ? 'rd' : 'th');
    
    return `${dayWithSuffix} ${month} ${year}`;
}

// NEW: Modal state management
let modalStates = {
    add: {
        fieldSectionOpen: false,
        imageSectionOpen: false
    },
    edit: {
        fieldSectionOpen: false,
        imageSectionOpen: false
    }
};

// NEW: Toggle add field section for both modals
function toggleAddFieldSection(modalType) {
    const section = document.getElementById(`${modalType}FieldSection`);
    const currentState = modalStates[modalType].fieldSectionOpen;
    
    if (currentState) {
        section.style.display = 'none';
        modalStates[modalType].fieldSectionOpen = false;
    } else {
        // Close image section if open
        if (modalStates[modalType].imageSectionOpen) {
            toggleAddImageSection(modalType);
        }
        
        section.style.display = 'block';
        modalStates[modalType].fieldSectionOpen = true;
        
        // Clear input fields
        document.getElementById(`${modalType}NewFieldLabel`).value = '';
        document.getElementById(`${modalType}NewFieldValue`).value = '';
    }
}

// NEW: Toggle add image section for both modals
function toggleAddImageSection(modalType) {
    const section = document.getElementById(`${modalType}ImageSection`);
    const currentState = modalStates[modalType].imageSectionOpen;
    
    if (currentState) {
        section.style.display = 'none';
        modalStates[modalType].imageSectionOpen = false;
    } else {
        // Close field section if open
        if (modalStates[modalType].fieldSectionOpen) {
            toggleAddFieldSection(modalType);
        }
        
        section.style.display = 'block';
        modalStates[modalType].imageSectionOpen = true;
        
        // Clear input fields
        document.getElementById(`${modalType}NewImageDescription`).value = '';
        document.getElementById(`${modalType}NewAdditionalImage`).value = '';
    }
}

// NEW: Add new field for both modals
function addNewField(modalType) {
    const label = document.getElementById(`${modalType}NewFieldLabel`).value;
    const value = document.getElementById(`${modalType}NewFieldValue`).value;
    
    if (!label || !value) {
        alert('Please fill in both field name and value');
        return;
    }
    
    const fieldKey = `custom_${Date.now()}`;
    addDynamicFieldToForm(modalType, fieldKey, label, value);
    
    // Clear inputs and close section
    document.getElementById(`${modalType}NewFieldLabel`).value = '';
    document.getElementById(`${modalType}NewFieldValue`).value = '';
    toggleAddFieldSection(modalType);
}

// NEW: Add additional image for both modals
async function addAdditionalImage(modalType) {
    const description = document.getElementById(`${modalType}NewImageDescription`).value;
    const imageFile = document.getElementById(`${modalType}NewAdditionalImage`).files[0];
    
    if (!imageFile) {
        alert('Please select an image file');
        return;
    }
    
    try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `additional-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('driver-images')
            .upload(fileName, imageFile, {
                upsert: true,
                cacheControl: '3600'
            });
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
            .from('driver-images')
            .getPublicUrl(fileName);
        
        // Add to form
        addAdditionalImageToForm(modalType, `new_${Date.now()}`, urlData.publicUrl, description);
        
        // Clear inputs and close section
        document.getElementById(`${modalType}NewImageDescription`).value = '';
        document.getElementById(`${modalType}NewAdditionalImage`).value = '';
        toggleAddImageSection(modalType);
        
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image');
    }
}

// NEW: Add dynamic field to form for both modals
function addDynamicFieldToForm(modalType, fieldKey, fieldLabel, fieldValue, fieldId = null) {
    const container = document.getElementById(`${modalType}DynamicFieldsContainer`);
    const fieldIdAttr = fieldId || `new_${Date.now()}`;
    
    const fieldHtml = `
        <div class="dynamic-field-item" data-field-id="${fieldIdAttr}" data-field-key="${fieldKey}">
            <div class="dynamic-field-info">
                <input type="text" value="${fieldLabel}" placeholder="Field Label">
                <input type="text" value="${fieldValue}" placeholder="Field Value">
            </div>
            <button type="button" class="remove-field-btn" onclick="removeField('${modalType}', '${fieldIdAttr}')">🗑️</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', fieldHtml);
}

// NEW: Add additional image to form for both modals
function addAdditionalImageToForm(modalType, imageId, imageUrl, description = '') {
    const container = document.getElementById(`${modalType}AdditionalImagesContainer`);
    
    const imageHtml = `
        <div class="additional-image-item" data-image-id="${imageId}">
            <img src="${imageUrl}" alt="Additional Image" class="additional-image-preview">
            <div class="additional-image-info">
                <p><strong>Description:</strong> ${description || 'No description'}</p>
            </div>
            <button type="button" class="remove-image-btn" onclick="removeAdditionalImage('${modalType}', '${imageId}')">🗑️ Remove</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', imageHtml);
}

// NEW: Remove field for both modals
function removeField(modalType, fieldId) {
    const fieldElement = document.querySelector(`#${modalType}DynamicFieldsContainer [data-field-id="${fieldId}"]`);
    if (fieldElement) {
        fieldElement.remove();
    }
}

// NEW: Remove additional image for both modals
function removeAdditionalImage(modalType, imageId) {
    const imageElement = document.querySelector(`#${modalType}AdditionalImagesContainer [data-image-id="${imageId}"]`);
    if (imageElement) {
        imageElement.remove();
    }
}

// UPDATED: Reset modal state when closing
function resetModalState(modalType) {
    // Reset section states
    modalStates[modalType].fieldSectionOpen = false;
    modalStates[modalType].imageSectionOpen = false;
    
    // Hide sections
    const fieldSection = document.getElementById(`${modalType}FieldSection`);
    const imageSection = document.getElementById(`${modalType}ImageSection`);
    
    if (fieldSection) fieldSection.style.display = 'none';
    if (imageSection) imageSection.style.display = 'none';
    
    // Clear input fields
    const fieldLabel = document.getElementById(`${modalType}NewFieldLabel`);
    const fieldValue = document.getElementById(`${modalType}NewFieldValue`);
    const imageDesc = document.getElementById(`${modalType}NewImageDescription`);
    const imageFile = document.getElementById(`${modalType}NewAdditionalImage`);
    
    if (fieldLabel) fieldLabel.value = '';
    if (fieldValue) fieldValue.value = '';
    if (imageDesc) imageDesc.value = '';
    if (imageFile) imageFile.value = '';
    
    // Reset No Driver mode for both modals
    if (modalType === 'add') {
        const noDriverBtn = document.getElementById('noDriverBtn');
        if (noDriverBtn && noDriverBtn.classList.contains('active')) {
            noDriverBtn.classList.remove('active');
            noDriverBtn.innerHTML = '🚫 No Driver';
            noDriverBtn.style.backgroundColor = '#ffc107';
        }
        enableDriverFields(); // Ensure fields are enabled when modal reopens
        
        // Reset contacts to one empty field with visible dustbin
        const contactsContainer = document.getElementById('addContactsContainer');
        contactsContainer.innerHTML = `
            <div class="contact-input-group">
                <input type="text" class="contact-input" placeholder="Phone number" required>
                <button type="button" class="btn-remove-contact" onclick="removeContactField(this)">🗑️</button>
            </div>
        `;
        updateContactRemoveButtons('addContactsContainer');
    }
    
    if (modalType === 'edit') {
        // For edit modal, we don't reset No Driver mode here
        // It should be determined by the actual truck data when opening
        // Just ensure fields are enabled (the actual state will be set in openEditModal)
        enableEditDriverFields();
    }
    
    // Clear dynamic containers for add modal
    if (modalType === 'add') {
        const dynamicContainer = document.getElementById(`${modalType}DynamicFieldsContainer`);
        const imagesContainer = document.getElementById(`${modalType}AdditionalImagesContainer`);
        
        if (dynamicContainer) dynamicContainer.innerHTML = '';
        if (imagesContainer) imagesContainer.innerHTML = '';
    }
}
// Enhanced Edit Driver Modal for No Trucks Section
async function openEditDriverModal(truckId) {
    currentTruckId = truckId;
    const modal = document.getElementById('editDriverModal');
    
    try {
        // Load driver data with contacts
        const { data: truck, error } = await supabase
            .from('trucks')
            .select(`
                *,
                driver_contacts (*)
            `)
            .eq('id', truckId)
            .single();

        if (error) throw error;

        // Fill form with current data
        document.getElementById('editDriverId').value = truck.id;
        document.getElementById('editDriverNameOnly').value = truck.driver_name || '';
        document.getElementById('editDriverLicenseOnly').value = truck.driver_license || '';
        document.getElementById('editDriverLicenseUrlOnly').value = truck.driver_license_url || '';
        
        // Load and display current driver image
        const currentDriverImage = document.getElementById('currentDriverImageOnly');
        const hasDriverImage = truck.driver_image_url && truck.driver_image_url !== '';
        if (currentDriverImage) {
            if (hasDriverImage) {
                currentDriverImage.src = truck.driver_image_url;
                currentDriverImage.style.display = 'block';
            } else {
                currentDriverImage.style.display = 'none';
            }
        }
        
        // Load contacts
        await loadDriverContactsForEdit(truckId);
        
        // Load previous trucks
        await loadPreviousTrucks(truckId);
        
        // Update save button state
        updateEditDriverSaveButtonState();
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading driver details:', error);
        alert('❌ Error loading driver details. Please check console.');
    }
}


// NEW: Add driver contact field
function addDriverContactField(phone = '', contactId = null) {
    const container = document.getElementById('editDriverContactsContainer');
    
    const contactGroup = document.createElement('div');
    contactGroup.className = 'contact-input-group';
    if (contactId) {
        contactGroup.setAttribute('data-contact-id', contactId);
    } else {
        contactGroup.setAttribute('data-contact-id', `new_${Date.now()}`);
    }
    
    contactGroup.innerHTML = `
        <input type="text" class="contact-input"  value="${phone}" ${!contactId ? 'required' : ''}>
        <button type="button" class="btn-remove-contact" onclick="removeDriverContactField(this)">🗑️</button>
    `;
    
    container.appendChild(contactGroup);
    updateDriverContactRemoveButtons();
}

// NEW: Remove driver contact field
function removeDriverContactField(button) {
    const contactGroup = button.closest('.contact-input-group');
    const contactId = contactGroup.getAttribute('data-contact-id');
    
    // If it's an existing contact (not new), mark it for deletion
    if (contactId && !contactId.startsWith('new_')) {
        if (!window.driverContactsToDelete) {
            window.driverContactsToDelete = [];
        }
        window.driverContactsToDelete.push(contactId);
    }
    
    contactGroup.remove();
    updateDriverContactRemoveButtons();
}

// NEW: Update driver contact remove buttons visibility
function updateDriverContactRemoveButtons() {
    const container = document.getElementById('editDriverContactsContainer');
    const contactGroups = container.querySelectorAll('.contact-input-group');
    const removeButtons = container.querySelectorAll('.btn-remove-contact');
    
    // Show remove buttons only if there's more than one contact
    if (contactGroups.length > 1) {
        removeButtons.forEach(btn => btn.style.display = 'inline-block');
    } else {
        removeButtons.forEach(btn => btn.style.display = 'none');
    }
}



// NEW: Add previous truck field
function addPreviousTruckField(truckNumber = '', index = null) {
    const container = document.getElementById('previousTrucksContainer');
    
    const truckGroup = document.createElement('div');
    truckGroup.className = 'previous-truck-group';
    truckGroup.setAttribute('data-truck-index', index !== null ? index : `new_${Date.now()}`);
    
    truckGroup.innerHTML = `
        <input type="text" class="previous-truck-input" placeholder="Truck Number" value="${truckNumber}">
        <button type="button" class="btn-remove-truck" onclick="removePreviousTruckField(this)">🗑️</button>
    `;
    
    container.appendChild(truckGroup);
    updatePreviousTruckRemoveButtons();
}

// NEW: Remove previous truck field
function removePreviousTruckField(button) {
    const truckGroup = button.closest('.previous-truck-group');
    truckGroup.remove();
    updatePreviousTruckRemoveButtons();
}

// NEW: Update previous truck remove buttons visibility
function updatePreviousTruckRemoveButtons() {
    const container = document.getElementById('previousTrucksContainer');
    const truckGroups = container.querySelectorAll('.previous-truck-group');
    const removeButtons = container.querySelectorAll('.btn-remove-truck');
    
    // Show remove buttons only if there's more than one truck
    if (truckGroups.length > 1) {
        removeButtons.forEach(btn => btn.style.display = 'inline-block');
    } else {
        removeButtons.forEach(btn => btn.style.display = 'none');
    }
}

// NEW: Handle edit driver form submit
async function handleEditDriverSubmit(event) {
    event.preventDefault();
    
    const driverId = document.getElementById('editDriverId').value;
    const driverName = document.getElementById('editDriverNameOnly').value;
    const driverLicense = document.getElementById('editDriverLicenseOnly').value;
    
    // Get contacts from form
    const contacts = getDriverContactsFromForm();
    if (contacts.length === 0) {
        alert('Please add at least one contact number');
        return;
    }
    
    // Get previous trucks from form
    const previousTrucks = getPreviousTrucksFromForm();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Saving...';
    submitBtn.disabled = true;
    
    try {
        // Update driver record
        const { error: updateError } = await supabase
            .from('trucks')
            .update({
                driver_name: driverName,
                driver_license: driverLicense,
                previous_trucks: previousTrucks.join(', ')
            })
            .eq('id', driverId);
        
        if (updateError) throw updateError;
        
        // Update contacts
        await updateDriverContacts(driverId, contacts);
        
        alert('✅ Driver details updated successfully!');
        document.getElementById('editDriverModal').style.display = 'none';
        
        // Reload the appropriate tab
        const activeAdminTab = document.querySelector('.admin-tab-content.active').id;
        loadTrucksByAdminStatus(activeAdminTab);
        
    } catch (error) {
        console.error('Error updating driver details:', error);
        alert('❌ Error updating driver details: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// NEW: Get driver contacts from form
function getDriverContactsFromForm() {
    const container = document.getElementById('editDriverContactsContainer');
    const contactGroups = container.querySelectorAll('.contact-input-group');
    
    const contacts = [];
    contactGroups.forEach(group => {
        const phoneInput = group.querySelector('.contact-input');
        const contactId = group.getAttribute('data-contact-id');
        
        if (phoneInput.value.trim()) {
            contacts.push({
                id: contactId,
                phone: phoneInput.value.trim()
            });
        }
    });
    
    return contacts;
}

// NEW: Get previous trucks from form
function getPreviousTrucksFromForm() {
    const container = document.getElementById('previousTrucksContainer');
    const truckGroups = container.querySelectorAll('.previous-truck-group');
    
    const previousTrucks = [];
    truckGroups.forEach(group => {
        const truckInput = group.querySelector('.previous-truck-input');
        if (truckInput.value.trim()) {
            previousTrucks.push(truckInput.value.trim());
        }
    });
    
    return previousTrucks;
}

// NEW: Global variable to track driver being reactivated
let driverToReactivate = null;

// NEW: Open reactivate confirmation modal
function openReactivateModal(truckId, driverName) {
    driverToReactivate = truckId;
    
    const modal = document.getElementById('reactivateModal');
    const message = document.getElementById('reactivateMessage');
    
    message.textContent = `Are you sure you want to reactivate ${driverName}? This will move the driver to "Drivers with No Trucks" section.`;
    modal.style.display = 'block';
}

// NEW: Handle reactivate confirmation
async function handleReactivateDriver() {
    if (!driverToReactivate) return;
    
    try {
        // Update driver status from 'left' to 'no_truck'
        const { error: updateError } = await supabase
            .from('trucks')
            .update({ 
                status: 'no_truck',
                // Generate a new unique truck number for the reactivated driver
                truck_number: `NO-TRUCK-${Date.now()}`
            })
            .eq('id', driverToReactivate);
        
        if (updateError) throw updateError;
        
       showSuccessModal('Driver reactivated successfully! Moved to "Drivers with No Trucks" section.');
        
        // Close the modal
        document.getElementById('reactivateModal').style.display = 'none';
        
        // UPDATE LAST UPDATED DATE
        await updateLastUpdatedDate('truck-list');
        
        // Reload both sections to reflect changes
        await loadTrucksByAdminStatus('no-truck');
        await loadTrucksByAdminStatus('left');
        
    } catch (error) {
        console.error('Error reactivating driver:', error);
        showErrorModal('Error reactivating driver: ' + error.message);
    } finally {
        driverToReactivate = null;
    }
}

// UPDATED: Setup reactivate modal event listeners
function setupReactivateModal() {
    const reactivateModal = document.getElementById('reactivateModal');
    if (!reactivateModal) return;
    
    const reactivateYesBtn = document.getElementById('reactivateYes');
    const reactivateNoBtn = document.getElementById('reactivateNo');
    const reactivateCloseBtn = reactivateModal.querySelector('.close');
    
    // Yes button - proceed with reactivation
    if (reactivateYesBtn) {
        reactivateYesBtn.onclick = handleReactivateDriver;
    }
    
    // No button - close modal
    if (reactivateNoBtn) {
        reactivateNoBtn.onclick = () => {
            reactivateModal.style.display = 'none';
            driverToReactivate = null;
        };
    }
    
    // Close button
    if (reactivateCloseBtn) {
        reactivateCloseBtn.onclick = () => {
            reactivateModal.style.display = 'none';
            driverToReactivate = null;
        };
    }
    
    // Close when clicking outside
    window.onclick = (event) => {
        if (event.target === reactivateModal) {
            reactivateModal.style.display = 'none';
            driverToReactivate = null;
        }
    };
}

// NEW: Global variables for assign truck functionality
let driverToAssign = null;
let selectedTruckForAssignment = null;

// NEW: Open assign truck modal
async function openAssignTruckModal(truckId) {
    driverToAssign = truckId;
    
    try {
        // Load driver details for confirmation message
        const { data: driver, error } = await supabase
            .from('trucks')
            .select('driver_name')
            .eq('id', truckId)
            .single();
        
        if (error) throw error;
        
        // Load available trucks (NO DRIVER trucks)
        await loadAvailableTrucks();
        
        const modal = document.getElementById('assignTruckModal');
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading driver details:', error);
        alert('Error loading driver details');
    }
}

// NEW: Load available trucks (NO DRIVER trucks)
async function loadAvailableTrucks() {
    const container = document.getElementById('availableTrucksList');
    container.innerHTML = '<div class="loading">Loading available trucks...</div>';
    
    try {
        const { data: trucks, error } = await supabase
            .from('trucks')
            .select('*')
            .eq('driver_name', 'NO DRIVER')
            .eq('status', 'active')
            .order('truck_number');
        
        if (error) throw error;
        
        if (!trucks || trucks.length === 0) {
            container.innerHTML = '<div class="no-results">No available trucks found. All trucks have drivers assigned.</div>';
            return;
        }
        
        displayAvailableTrucks(trucks);
        
    } catch (error) {
        console.error('Error loading available trucks:', error);
        container.innerHTML = '<div class="error">Error loading available trucks</div>';
    }
}

// NEW: Display available trucks
function displayAvailableTrucks(trucks) {
    const container = document.getElementById('availableTrucksList');
    container.innerHTML = '';
    
    trucks.forEach(truck => {
        const truckCard = document.createElement('div');
        truckCard.className = 'available-truck-card';
        truckCard.innerHTML = `
            <div class="truck-number-only">${truck.truck_number}</div>
        `;
        
        truckCard.onclick = () => {
            selectTruckForAssignment(truck);
        };
        
        container.appendChild(truckCard);
    });
}

// NEW: Select truck for assignment
function selectTruckForAssignment(truck) {
    selectedTruckForAssignment = truck;
    
    // Close the selection modal
    document.getElementById('assignTruckModal').style.display = 'none';
    
    // Open confirmation modal
    openAssignConfirmationModal();
}

// NEW: Open assignment confirmation modal
async function openAssignConfirmationModal() {
    if (!driverToAssign || !selectedTruckForAssignment) return;
    
    try {
        // Load driver details for the message
        const { data: driver, error } = await supabase
            .from('trucks')
            .select('driver_name')
            .eq('id', driverToAssign)
            .single();
        
        if (error) throw error;
        
        const modal = document.getElementById('assignConfirmModal');
        const message = document.getElementById('assignConfirmMessage');
        
        message.textContent = `Do you want to assign ${driver.driver_name} to the truck ${selectedTruckForAssignment.truck_number}?`;
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading driver details:', error);
        alert('Error loading driver details');
    }
}

// NEW: Handle truck assignment
async function handleTruckAssignment() {
    if (!driverToAssign || !selectedTruckForAssignment) return;
    
    try {
        // Get driver details from the no-truck driver record
        const { data: driver, error: driverError } = await supabase
            .from('trucks')
            .select('*')
            .eq('id', driverToAssign)
            .single();
        
        if (driverError) throw driverError;
        
        // Update the selected truck with driver details
        const { error: updateError } = await supabase
            .from('trucks')
            .update({
                driver_name: driver.driver_name,
                driver_license: driver.driver_license,
                driver_image_url: driver.driver_image_url,
                // Update contacts by transferring them
                previous_trucks: driver.previous_trucks ? 
                    `${driver.previous_trucks}, ${selectedTruckForAssignment.truck_number}` : 
                    selectedTruckForAssignment.truck_number
            })
            .eq('id', selectedTruckForAssignment.id);
        
        if (updateError) throw updateError;
        
        // Update driver contacts to the new truck
        const { data: contacts, error: contactsError } = await supabase
            .from('driver_contacts')
            .select('*')
            .eq('truck_id', driverToAssign);
        
        if (contactsError) throw contactsError;
        
        if (contacts && contacts.length > 0) {
            // Delete existing contacts from the target truck (if any)
            await supabase
                .from('driver_contacts')
                .delete()
                .eq('truck_id', selectedTruckForAssignment.id);
            
            // Insert driver contacts to the target truck
            const contactsToInsert = contacts.map(contact => ({
                truck_id: selectedTruckForAssignment.id,
                phone_number: contact.phone_number,
                contact_type: contact.contact_type
            }));
            
            const { error: insertError } = await supabase
                .from('driver_contacts')
                .insert(contactsToInsert);
            
            if (insertError) throw insertError;
        }
        
        // Delete the original no-truck driver record
        const { error: deleteError } = await supabase
            .from('trucks')
            .delete()
            .eq('id', driverToAssign);
        
        if (deleteError) throw deleteError;
        
        showSuccessModal('Driver assigned to truck successfully!');
        
        // Close the modal
        document.getElementById('assignConfirmModal').style.display = 'none';
        
        // UPDATE LAST UPDATED DATE
        await updateLastUpdatedDate('truck-list');
        
        // Reload both sections to reflect changes
        await loadTrucksByAdminStatus('all-trucks');
        await loadTrucksByAdminStatus('no-truck');
        
    } catch (error) {
        console.error('Error assigning truck:', error);
        showErrorModal('Error assigning truck: ' + error.message);
    } finally {
        // Reset variables
        driverToAssign = null;
        selectedTruckForAssignment = null;
    }
}

// UPDATED: Setup assign truck modals
function setupAssignTruckModals() {
    const assignModal = document.getElementById('assignTruckModal');
    const assignConfirmModal = document.getElementById('assignConfirmModal');
    
    if (!assignModal || !assignConfirmModal) return;
    
    // Assign selection modal close handlers
    const assignCloseBtn = assignModal.querySelector('.close');
    if (assignCloseBtn) {
        assignCloseBtn.onclick = () => {
            assignModal.style.display = 'none';
            driverToAssign = null;
        };
    }
    
    // Assign confirmation modal handlers
    const assignConfirmYes = document.getElementById('assignConfirmYes');
    const assignConfirmNo = document.getElementById('assignConfirmNo');
    const assignConfirmClose = assignConfirmModal.querySelector('.close');
    
    if (assignConfirmYes) {
        assignConfirmYes.onclick = handleTruckAssignment;
    }
    
    if (assignConfirmNo) {
        assignConfirmNo.onclick = () => {
            assignConfirmModal.style.display = 'none';
            driverToAssign = null;
            selectedTruckForAssignment = null;
        };
    }
    
    if (assignConfirmClose) {
        assignConfirmClose.onclick = () => {
            assignConfirmModal.style.display = 'none';
            driverToAssign = null;
            selectedTruckForAssignment = null;
        };
    }
    
    // Close when clicking outside
    window.onclick = (event) => {
        if (event.target === assignModal) {
            assignModal.style.display = 'none';
            driverToAssign = null;
        }
        if (event.target === assignConfirmModal) {
            assignConfirmModal.style.display = 'none';
            driverToAssign = null;
            selectedTruckForAssignment = null;
        }
    };
}

// UPDATED: Validate truck form (fixes COMESA/C28 expiry validation)
function validateTruckForm(modalType, isNoDriverMode = false) {
    const modalPrefix = modalType === 'add' ? 'add' : 'edit';
    const errors = [];

    // Always validate truck fields (required in both modes)
    const truckNumber = document.getElementById(`${modalPrefix}TruckNumber`).value.trim();
    const truckType = document.getElementById(`${modalPrefix}TruckType`).value.trim();
    const truckBody = document.getElementById(`${modalPrefix}TruckBody`).value.trim();
    const truckMake = document.getElementById(`${modalPrefix}TruckMake`).value.trim();
    const truckTons = document.getElementById(`${modalPrefix}TruckTons`).value.trim();
    const truckImage = document.getElementById(`${modalPrefix}TruckImage`).files[0];

    if (!truckNumber) errors.push('Truck Number is required');
    if (!truckType) errors.push('Truck Type is required');
    if (!truckBody) errors.push('Truck Body is required');
    if (!truckMake) errors.push('Truck Make is required');
    if (!truckTons) errors.push('Truck Tons is required');
    if (!truckImage && modalType === 'add') errors.push('Truck Image is required');

    // Validate driver fields only if NOT in "No Driver" mode
    if (!isNoDriverMode) {
        const driverName = document.getElementById(`${modalPrefix}DriverName`).value.trim();
        const driverLicense = document.getElementById(`${modalPrefix}DriverLicense`).value.trim();
        const driverImage = document.getElementById(`${modalPrefix}DriverImage`).files[0];

        // Check contacts
        const contactContainer = document.getElementById(`${modalPrefix}ContactsContainer`);
        const contactInputs = contactContainer.querySelectorAll('.contact-input');
        const hasContacts = Array.from(contactInputs).some(input => input.value.trim());

        if (!driverName) errors.push('Driver Name is required');
        if (!driverLicense) errors.push('Driver License is required');
        if (!hasContacts) errors.push('At least one Driver Contact is required');
        if (!driverImage && modalType === 'add') errors.push('Driver Image is required');
    }

    // FIXED: Validate COMESA/C28 expiry dates only when they are set to YES
    const comesa = document.getElementById(`${modalPrefix}Comesa`).value;
    const comesaExpiry = document.getElementById(`${modalPrefix}ComesaExpiry`).value;
    const c28 = document.getElementById(`${modalPrefix}C28`).value;
    const c28Expiry = document.getElementById(`${modalPrefix}C28Expiry`).value;

    // Only require expiry date if the corresponding field is set to YES
    if (comesa === 'YES' && !comesaExpiry) {
        errors.push('COMESA Expiry date is required when COMESA is YES');
    }
    if (c28 === 'YES' && !c28Expiry) {
        errors.push('C28 Expiry date is required when C28 is YES');
    }

    return errors;
}


// NEW FUNCTION: Handle COMESA dropdown change
function handleComesaChange(modalType) {
    const prefix = modalType === 'add' ? 'add' : 'edit';
    const comesaSelect = document.getElementById(`${prefix}Comesa`);
    const comesaExpiryInput = document.getElementById(`${prefix}ComesaExpiry`);
    
    if (comesaSelect.value === 'YES') {
        // Show and require expiry date
        comesaExpiryInput.required = true;
        comesaExpiryInput.style.display = 'block';
        // Show the label if it was hidden
        const comesaExpiryLabel = comesaExpiryInput.previousElementSibling;
        if (comesaExpiryLabel && comesaExpiryLabel.tagName === 'LABEL') {
            comesaExpiryLabel.style.display = 'block';
        }
    } else {
        // Hide and clear expiry date
        comesaExpiryInput.required = false;
        comesaExpiryInput.value = '';
        comesaExpiryInput.style.display = 'none';
        // Hide the label
        const comesaExpiryLabel = comesaExpiryInput.previousElementSibling;
        if (comesaExpiryLabel && comesaExpiryLabel.tagName === 'LABEL') {
            comesaExpiryLabel.style.display = 'none';
        }
    }
    
    // Update save button state
    if (modalType === 'add') {
        updateSaveButtonState();
    } else {
        updateEditSaveButtonState();
    }
}

// NEW FUNCTION: Handle C28 dropdown change
function handleC28Change(modalType) {
    const prefix = modalType === 'add' ? 'add' : 'edit';
    const c28Select = document.getElementById(`${prefix}C28`);
    const c28ExpiryInput = document.getElementById(`${prefix}C28Expiry`);
    
    if (c28Select.value === 'YES') {
        // Show and require expiry date
        c28ExpiryInput.required = true;
        c28ExpiryInput.style.display = 'block';
        // Show the label if it was hidden
        const c28ExpiryLabel = c28ExpiryInput.previousElementSibling;
        if (c28ExpiryLabel && c28ExpiryLabel.tagName === 'LABEL') {
            c28ExpiryLabel.style.display = 'block';
        }
    } else {
        // Hide and clear expiry date
        c28ExpiryInput.required = false;
        c28ExpiryInput.value = '';
        c28ExpiryInput.style.display = 'none';
        // Hide the label
        const c28ExpiryLabel = c28ExpiryInput.previousElementSibling;
        if (c28ExpiryLabel && c28ExpiryLabel.tagName === 'LABEL') {
            c28ExpiryLabel.style.display = 'none';
        }
    }
    
    // Update save button state
    if (modalType === 'add') {
        updateSaveButtonState();
    } else {
        updateEditSaveButtonState();
    }
}

// NEW FUNCTION: Clear driver fields
function clearDriverFields() {
    document.getElementById('addDriverName').value = 'NO DRIVER';
    document.getElementById('addDriverLicense').value = '';
    
    // Clear contacts
    const contactsContainer = document.getElementById('addContactsContainer');
    contactsContainer.innerHTML = '';
    
    // Clear driver image
    document.getElementById('addDriverImage').value = '';
    
    // Disable driver fields
    document.getElementById('addDriverName').disabled = true;
    document.getElementById('addDriverLicense').disabled = true;
}

// UPDATED: Toggle No Driver mode
function toggleNoDriverMode() {
    const noDriverBtn = document.getElementById('noDriverBtn');
    const isActive = noDriverBtn.classList.contains('active');
    
    if (isActive) {
        // Deactivate No Driver mode
        noDriverBtn.classList.remove('active');
        noDriverBtn.innerHTML = '🚫 No Driver';
        noDriverBtn.style.backgroundColor = '#ffc107';
        enableDriverFields();
    } else {
        // Activate No Driver mode
        noDriverBtn.classList.add('active');
        noDriverBtn.innerHTML = '✅ No Driver Mode Active';
        noDriverBtn.style.backgroundColor = '#28a745';
        disableDriverFields();
    }
    
    // Update validation state
    updateSaveButtonState();
}

// NEW FUNCTION: Disable driver fields (keep them visible but readonly)
function disableDriverFields() {
    // Set driver name to "NO DRIVER" and make readonly
    document.getElementById('addDriverName').value = 'NO DRIVER';
    document.getElementById('addDriverName').readOnly = true;
    document.getElementById('addDriverName').style.backgroundColor = '#f8f9fa';
    document.getElementById('addDriverName').style.cursor = 'not-allowed';
    
    // Clear and disable driver license
    document.getElementById('addDriverLicense').value = '';
    document.getElementById('addDriverLicense').readOnly = true;
    document.getElementById('addDriverLicense').style.backgroundColor = '#f8f9fa';
    document.getElementById('addDriverLicense').style.cursor = 'not-allowed';
    
    // Clear and disable driver image
    document.getElementById('addDriverImage').value = '';
    document.getElementById('addDriverImage').disabled = true;
    document.getElementById('addDriverImage').style.backgroundColor = '#f8f9fa';
    document.getElementById('addDriverImage').style.cursor = 'not-allowed';
    
    // Make all existing contact fields readonly
    const contactInputs = document.querySelectorAll('#addContactsContainer .contact-input');
    contactInputs.forEach(input => {
        input.value = '';
        input.readOnly = true;
        input.placeholder = '';
        input.style.backgroundColor = '#f8f9fa';
        input.style.cursor = 'not-allowed';
    });
    
    // Hide the "Add Another Number" button
    const addContactBtn = document.querySelector('#addContactsContainer').nextElementSibling;
    if (addContactBtn && addContactBtn.classList.contains('btn-secondary')) {
        addContactBtn.style.display = 'none';
    }
}

// UPDATED: Enable driver fields (make them writable again)
function enableDriverFields() {
    // Enable driver name
    document.getElementById('addDriverName').value = '';
    document.getElementById('addDriverName').readOnly = false;
    document.getElementById('addDriverName').style.backgroundColor = '';
    document.getElementById('addDriverName').style.cursor = '';
    document.getElementById('addDriverName').placeholder = '';
    
    // Enable driver license
    document.getElementById('addDriverLicense').value = '';
    document.getElementById('addDriverLicense').readOnly = false;
    document.getElementById('addDriverLicense').style.backgroundColor = '';
    document.getElementById('addDriverLicense').style.cursor = '';
    document.getElementById('addDriverLicense').placeholder = '';
    
    // Enable driver image
    document.getElementById('addDriverImage').disabled = false;
    document.getElementById('addDriverImage').style.backgroundColor = '';
    document.getElementById('addDriverImage').style.cursor = '';
    
    // Make all existing contact fields writable
    const contactInputs = document.querySelectorAll('#addContactsContainer .contact-input');
    contactInputs.forEach(input => {
        input.readOnly = false;
        input.placeholder = '';
        input.style.backgroundColor = '';
        input.style.cursor = '';
    });
    
    // Show the "Add Another Number" button
    const addContactBtn = document.querySelector('#addContactsContainer').nextElementSibling;
    if (addContactBtn && addContactBtn.classList.contains('btn-secondary')) {
        addContactBtn.style.display = 'inline-block';
    }
}

// NEW FUNCTION: Update save button state
function updateSaveButtonState() {
    const noDriverMode = document.getElementById('noDriverBtn').classList.contains('active');
    const errors = validateTruckForm('add', noDriverMode);
    const saveBtn = document.querySelector('#addForm button[type="submit"]');
    
    if (errors.length === 0) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
    } else {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.6';
    }
}

// UPDATED: Add real-time validation listeners for both modals
function addValidationListeners() {
    const modalTypes = ['add', 'edit'];
    
    modalTypes.forEach(modalType => {
        const prefix = modalType === 'add' ? 'add' : 'edit';
        const requiredFields = [
            `${prefix}TruckNumber`, `${prefix}DriverName`, `${prefix}DriverLicense`, `${prefix}TruckType`,
            `${prefix}TruckBody`, `${prefix}TruckMake`, `${prefix}TruckTons`
        ];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', function() {
                    if (modalType === 'add') {
                        updateSaveButtonState();
                    } else {
                        updateEditSaveButtonState();
                    }
                });
                field.addEventListener('change', function() {
                    if (modalType === 'add') {
                        updateSaveButtonState();
                    } else {
                        updateEditSaveButtonState();
                    }
                });
            }
        });
        
        // Listen for file inputs
        const fileInputs = [`${prefix}DriverImage`, `${prefix}TruckImage`];
        fileInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', function() {
                    if (modalType === 'add') {
                        updateSaveButtonState();
                    } else {
                        updateEditSaveButtonState();
                    }
                });
            }
        });
        
        // Listen for COMESA/C28 changes (already handled by the new functions)
        const comesaField = document.getElementById(`${prefix}Comesa`);
        const c28Field = document.getElementById(`${prefix}C28`);
        
        if (comesaField) {
            comesaField.addEventListener('change', function() {
                handleComesaChange(modalType);
            });
        }
        
        if (c28Field) {
            c28Field.addEventListener('change', function() {
                handleC28Change(modalType);
            });
        }
    });
}

// NEW: Setup delete confirmation modal
function setupDeleteModal() {
    const deleteModal = document.getElementById('deleteConfirmModal');
    const deleteCloseBtn = deleteModal.querySelector('.close');
    const deleteNoBtn = deleteModal.querySelector('.btn-back');

    // Close button
    deleteCloseBtn.onclick = () => {
        deleteModal.style.display = 'none';
        currentTruckId = null;
    };
    
    // No button
    deleteNoBtn.onclick = () => {
        deleteModal.style.display = 'none';
        currentTruckId = null;
    };
    
    // Close when clicking outside
    window.onclick = (event) => {
        if (event.target === deleteModal) {
            deleteModal.style.display = 'none';
            currentTruckId = null;
        }
    };
}

// NEW FUNCTION: Toggle No Driver mode for Edit modal
function toggleEditNoDriverMode() {
    const noDriverBtn = document.getElementById('editNoDriverBtn');
    const isActive = noDriverBtn.classList.contains('active');
    
    if (isActive) {
        // Deactivate No Driver mode
        noDriverBtn.classList.remove('active');
        noDriverBtn.innerHTML = '🚫 No Driver';
        noDriverBtn.style.backgroundColor = '#ffc107';
        enableEditDriverFields();
    } else {
        // Activate No Driver mode
        noDriverBtn.classList.add('active');
        noDriverBtn.innerHTML = '✅ No Driver Mode Active';
        noDriverBtn.style.backgroundColor = '#28a745';
        disableEditDriverFields();
    }
    
    // Update validation state
    updateEditSaveButtonState();
}

// NEW FUNCTION: Disable driver fields in Edit modal
function disableEditDriverFields() {
    // Set driver name to "NO DRIVER" and make readonly
    document.getElementById('editDriverName').value = 'NO DRIVER';
    document.getElementById('editDriverName').readOnly = true;
    document.getElementById('editDriverName').style.backgroundColor = '#f8f9fa';
    document.getElementById('editDriverName').style.cursor = 'not-allowed';
    
    // Clear and disable driver license
    document.getElementById('editDriverLicense').value = '';
    document.getElementById('editDriverLicense').readOnly = true;
    document.getElementById('editDriverLicense').style.backgroundColor = '#f8f9fa';
    document.getElementById('editDriverLicense').style.cursor = 'not-allowed';
    
    // Disable driver image upload
    document.getElementById('editDriverImage').disabled = true;
    document.getElementById('editDriverImage').style.backgroundColor = '#f8f9fa';
    document.getElementById('editDriverImage').style.cursor = 'not-allowed';
    
    // Hide current driver image if it exists
    const currentDriverImage = document.getElementById('currentDriverImage');
    if (currentDriverImage) {
        currentDriverImage.style.display = 'none';
    }
    
    // Make all existing contact fields readonly and clear them
    const contactInputs = document.querySelectorAll('#editContactsContainer .contact-input');
    contactInputs.forEach(input => {
        input.value = '';
        input.readOnly = true;
        input.placeholder = 'No driver - field disabled';
        input.style.backgroundColor = '#f8f9fa';
        input.style.cursor = 'not-allowed';
    });
    
    // Hide the "Add Another Number" button
    const addContactBtn = document.querySelector('#editContactsContainer').nextElementSibling;
    if (addContactBtn && addContactBtn.classList.contains('btn-secondary')) {
        addContactBtn.style.display = 'none';
    }
}

// NEW FUNCTION: Enable driver fields in Edit modal
function enableEditDriverFields() {
    // Enable driver name (but don't clear the value - keep existing data)
    document.getElementById('editDriverName').readOnly = false;
    document.getElementById('editDriverName').style.backgroundColor = '';
    document.getElementById('editDriverName').style.cursor = '';
    document.getElementById('editDriverName').placeholder = '';
    
    // Enable driver license (but don't clear the value - keep existing data)
    document.getElementById('editDriverLicense').readOnly = false;
    document.getElementById('editDriverLicense').style.backgroundColor = '';
    document.getElementById('editDriverLicense').style.cursor = '';
    document.getElementById('editDriverLicense').placeholder = '';
    
    // Enable driver image upload
    document.getElementById('editDriverImage').disabled = false;
    document.getElementById('editDriverImage').style.backgroundColor = '';
    document.getElementById('editDriverImage').style.cursor = '';
    
    // Show current driver image if it exists
    const currentDriverImage = document.getElementById('currentDriverImage');
    if (currentDriverImage && currentDriverImage.src) {
        currentDriverImage.style.display = 'block';
    }
    
    // Make all existing contact fields writable (but don't clear them)
    const contactInputs = document.querySelectorAll('#editContactsContainer .contact-input');
    contactInputs.forEach(input => {
        input.readOnly = false;
        input.placeholder = 'Phone number';
        input.style.backgroundColor = '';
        input.style.cursor = '';
    });
    
    // Show the "Add Another Number" button
    const addContactBtn = document.querySelector('#editContactsContainer').nextElementSibling;
    if (addContactBtn && addContactBtn.classList.contains('btn-secondary')) {
        addContactBtn.style.display = 'inline-block';
    }
}

// NEW FUNCTION: Update edit save button state
function updateEditSaveButtonState() {
    const noDriverMode = document.getElementById('editNoDriverBtn').classList.contains('active');
    const errors = validateTruckForm('edit', noDriverMode);
    const saveBtn = document.querySelector('#editForm button[type="submit"]');
    
    if (errors.length === 0) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
    } else {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.6';
    }
}








// Function to download license document
function downloadLicenseDocument() {
    const currentLicenseSection = document.getElementById('currentLicenseSection');
    const licenseUrl = currentLicenseSection ? currentLicenseSection.getAttribute('data-license-url') : null;
    
    if (!licenseUrl) {
        alert('No license document available');
        return;
    }
    
    // Convert Google Drive URL to direct download format
    const downloadUrl = convertToDirectDownloadUrl(licenseUrl);
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    link.download = 'driving-license';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}



// Function to print license document as PDF
function printLicenseDocument() {
    const currentLicenseSection = document.getElementById('currentLicenseSection');
    const licenseUrl = currentLicenseSection ? currentLicenseSection.getAttribute('data-license-url') : null;
    
    if (!licenseUrl) {
        alert('No license document available');
        return;
    }
    
    // Open in new window and trigger print
    const printWindow = window.open(licenseUrl, '_blank');
    
    // Wait for the window to load then trigger print
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 1000);
    };
}

// Function to view license document
function viewLicenseDocument() {
    const currentLicenseSection = document.getElementById('currentLicenseSection');
    const licenseUrl = currentLicenseSection ? currentLicenseSection.getAttribute('data-license-url') : null;
    
    if (!licenseUrl) {
        alert('No license document available');
        return;
    }
    window.open(licenseUrl, '_blank');
}

// Function to view license document from view details
function viewLicenseDocumentFromUrl(licenseUrl) {
    if (!licenseUrl) {
        alert('No license document available');
        return;
    }
    window.open(licenseUrl, '_blank');
}
// Function to print license document from view details
function printLicenseDocumentFromUrl(licenseUrl) {
    if (!licenseUrl) {
        alert('No license document available');
        return;
    }
    
    // Open in new window and trigger print
    const printWindow = window.open(licenseUrl, '_blank');
    
    // Wait for the window to load then trigger print
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 1000);
    };
    
    // Fallback in case onload doesn't fire
    setTimeout(() => {
        try {
            printWindow.print();
        } catch (error) {
            console.log('Print might require user interaction');
            // Let user manually print from the opened window
        }
    }, 2000);
}

// Function to download license document from view details
function downloadLicenseDocumentFromUrl(licenseUrl) {
    if (!licenseUrl) {
        alert('No license document available');
        return;
    }
    
    // Method 1: Try to open in new tab and let user manually download
    const newTab = window.open(licenseUrl, '_blank');
    
    // Method 2: Show instructions if download doesn't work
    setTimeout(() => {
        const userConfirmed = confirm(
            'If download did not start automatically:\n\n' +
            '1. Right-click on the opened page\n' +
            '2. Select "Save as" or "Download"\n' +
            '3. Choose where to save the file\n\n' +
            'Click OK to open the file again.'
        );
        
        if (userConfirmed) {
            window.open(licenseUrl, '_blank');
        }
    }, 2000);
}
// NEW FUNCTION: Convert Google Drive URL to direct download format
function convertToDirectDownloadUrl(googleDriveUrl) {
    // If it's already a direct download URL, return as is
    if (googleDriveUrl.includes('uc?export=download')) {
        return googleDriveUrl;
    }
    
    // Extract file ID from different Google Drive URL formats
    let fileId = '';
    
    // Format 1: https://drive.google.com/file/d/FILE_ID/view
    if (googleDriveUrl.includes('/file/d/')) {
        const match = googleDriveUrl.match(/\/file\/d\/([^\/]+)/);
        if (match && match[1]) {
            fileId = match[1];
        }
    }
    // Format 2: https://drive.google.com/open?id=FILE_ID
    else if (googleDriveUrl.includes('open?id=')) {
        const match = googleDriveUrl.match(/open\?id=([^&]+)/);
        if (match && match[1]) {
            fileId = match[1];
        }
    }
    // Format 3: https://docs.google.com/document/d/FILE_ID/edit
    else if (googleDriveUrl.includes('/document/d/')) {
        const match = googleDriveUrl.match(/\/document\/d\/([^\/]+)/);
        if (match && match[1]) {
            fileId = match[1];
        }
    }
    // Format 4: https://docs.google.com/spreadsheets/d/FILE_ID/edit
    else if (googleDriveUrl.includes('/spreadsheets/d/')) {
        const match = googleDriveUrl.match(/\/spreadsheets\/d\/([^\/]+)/);
        if (match && match[1]) {
            fileId = match[1];
        }
    }
    
    // If we found a file ID, convert to direct download URL
    if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    
    // If we can't convert, return original URL (user might need to sign in)
    return googleDriveUrl;
}

// Success/Error Modal Functions
function showSuccessModal(message, title = 'Success') {
    document.getElementById('successTitle').textContent = title;
    document.getElementById('successMessage').textContent = message;
    document.getElementById('successModal').style.display = 'block';
}

function showErrorModal(message, title = 'Error') {
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').style.display = 'block';
}

function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
}

function closeErrorModal() {
    document.getElementById('errorModal').style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function(event) {
    const successModal = document.getElementById('successModal');
    const errorModal = document.getElementById('errorModal');
    
    if (event.target === successModal) {
        closeSuccessModal();
    }
    if (event.target === errorModal) {
        closeErrorModal();
    }
};

// =============================================
// ADD DRIVER FUNCTIONS
// =============================================

let driverImageFile = null;

// Open Add Driver Modal
function openAddDriverModal() {
    console.log('Opening Add Driver Modal');
    
    // Reset the form and state
    document.getElementById('addDriverForm').reset();
    driverImageFile = null;
    
    // Reset image preview
    const imagePreview = document.getElementById('driverImagePreview');
    imagePreview.style.display = 'none';
    imagePreview.src = '';
    
    // Reset contacts container with one empty field
    const contactsContainer = document.getElementById('addDriverContactsContainer');
    contactsContainer.innerHTML = `
        <div class="contact-input-group">
            <input type="text" class="contact-input" placeholder="Phone number" required oninput="validateAddDriverForm()">
            <button type="button" class="btn-remove-contact" onclick="removeAddDriverContactField(this)" style="display:none;">🗑️</button>
        </div>
    `;
    
    // Reset previous trucks container with one empty field
    const trucksContainer = document.getElementById('addPreviousTrucksContainer');
    trucksContainer.innerHTML = `
        <div class="previous-truck-group">
            <input type="text" class="previous-truck-input" placeholder="Truck Number">
            <button type="button" class="btn-remove-truck" onclick="removeAddPreviousTruckField(this)" style="display:none;">🗑️</button>
        </div>
    `;
    
    // Reset submit button
    document.getElementById('addDriverSubmitBtn').disabled = true;
    
    // Show the modal
    document.getElementById('addDriverModal').style.display = 'block';
}

// Close Add Driver Modal
function closeAddDriverModal() {
    document.getElementById('addDriverModal').style.display = 'none';
}

// Preview Driver Image
function previewDriverImage(input) {
    const preview = document.getElementById('driverImagePreview');
    const file = input.files[0];
    
    if (file) {
        driverImageFile = file;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
        preview.src = '';
        driverImageFile = null;
    }
    
    validateAddDriverForm();
}

// Validate Add Driver Form
function validateAddDriverForm() {
    const driverName = document.getElementById('addDriverNameOnly').value.trim();
    const driverLicense = document.getElementById('addDriverLicenseOnly').value.trim();
    const driverImage = document.getElementById('addDriverImageOnly').files[0];
    
    // Check contacts
    const contacts = getAddDriverContactsFromForm();
    const hasValidContacts = contacts.length > 0;
    
    // All required fields must be filled
    const isValid = driverName && driverLicense && driverImage && hasValidContacts;
    
    const submitBtn = document.getElementById('addDriverSubmitBtn');
    submitBtn.disabled = !isValid;
    
    return isValid;
}

// Add Driver Contact Field
function addDriverContactField(phone = '') {
    const container = document.getElementById('addDriverContactsContainer');
    
    const contactGroup = document.createElement('div');
    contactGroup.className = 'contact-input-group';
    contactGroup.setAttribute('data-contact-id', `new_${Date.now()}`);
    
    contactGroup.innerHTML = `
        <input type="text" class="contact-input" placeholder="Phone number" value="${phone}" required oninput="validateAddDriverForm()">
        <button type="button" class="btn-remove-contact" onclick="removeAddDriverContactField(this)">🗑️</button>
    `;
    
    container.appendChild(contactGroup);
    updateAddDriverContactRemoveButtons();
    validateAddDriverForm();
}

// Remove Driver Contact Field
function removeAddDriverContactField(button) {
    const contactGroup = button.closest('.contact-input-group');
    const container = contactGroup.parentElement;
    const contactGroups = container.querySelectorAll('.contact-input-group');
    
    if (contactGroups.length > 1) {
        contactGroup.remove();
    } else {
        const contactInput = contactGroup.querySelector('.contact-input');
        contactInput.value = '';
        contactInput.focus();
    }
    
    updateAddDriverContactRemoveButtons();
    validateAddDriverForm();
}

// Update Driver Contact Remove Buttons Visibility
function updateAddDriverContactRemoveButtons() {
    const container = document.getElementById('addDriverContactsContainer');
    const contactGroups = container.querySelectorAll('.contact-input-group');
    const removeButtons = container.querySelectorAll('.btn-remove-contact');
    
    if (contactGroups.length > 1) {
        removeButtons.forEach(btn => btn.style.display = 'inline-block');
    } else {
        removeButtons.forEach(btn => btn.style.display = 'none');
    }
}

// Add Previous Truck Field
function addPreviousTruckField(truckNumber = '') {
    const container = document.getElementById('addPreviousTrucksContainer');
    
    const truckGroup = document.createElement('div');
    truckGroup.className = 'previous-truck-group';
    truckGroup.setAttribute('data-truck-index', `new_${Date.now()}`);
    
    truckGroup.innerHTML = `
        <input type="text" class="previous-truck-input" placeholder="Truck Number" value="${truckNumber}">
        <button type="button" class="btn-remove-truck" onclick="removeAddPreviousTruckField(this)">🗑️</button>
    `;
    
    container.appendChild(truckGroup);
    updateAddPreviousTruckRemoveButtons();
}

// Remove Previous Truck Field
function removeAddPreviousTruckField(button) {
    const truckGroup = button.closest('.previous-truck-group');
    const container = truckGroup.parentElement;
    const truckGroups = container.querySelectorAll('.previous-truck-group');
    
    if (truckGroups.length > 1) {
        truckGroup.remove();
    } else {
        const truckInput = truckGroup.querySelector('.previous-truck-input');
        truckInput.value = '';
        truckInput.focus();
    }
    
    updateAddPreviousTruckRemoveButtons();
}

// Update Previous Truck Remove Buttons Visibility
function updateAddPreviousTruckRemoveButtons() {
    const container = document.getElementById('addPreviousTrucksContainer');
    const truckGroups = container.querySelectorAll('.previous-truck-group');
    const removeButtons = container.querySelectorAll('.btn-remove-truck');
    
    if (truckGroups.length > 1) {
        removeButtons.forEach(btn => btn.style.display = 'inline-block');
    } else {
        removeButtons.forEach(btn => btn.style.display = 'none');
    }
}

// Get contacts from Add Driver form
function getAddDriverContactsFromForm() {
    const container = document.getElementById('addDriverContactsContainer');
    const contactGroups = container.querySelectorAll('.contact-input-group');
    
    const contacts = [];
    contactGroups.forEach(group => {
        const phoneInput = group.querySelector('.contact-input');
        if (phoneInput.value.trim()) {
            contacts.push({
                phone: phoneInput.value.trim()
            });
        }
    });
    
    return contacts;
}

// Get previous trucks from Add Driver form
function getAddPreviousTrucksFromForm() {
    const container = document.getElementById('addPreviousTrucksContainer');
    const truckGroups = container.querySelectorAll('.previous-truck-group');
    
    const previousTrucks = [];
    truckGroups.forEach(group => {
        const truckInput = group.querySelector('.previous-truck-input');
        if (truckInput.value.trim()) {
            previousTrucks.push(truckInput.value.trim());
        }
    });
    
    return previousTrucks;
}

// Handle Add Driver Form Submit
async function handleAddDriverSubmit(event) {
    event.preventDefault();
    console.log('Add Driver form submitted');
    
    if (!validateAddDriverForm()) {
        alert('Please fill all required fields');
        return;
    }
    
    const driverName = document.getElementById('addDriverNameOnly').value.trim();
    const driverLicense = document.getElementById('addDriverLicenseOnly').value.trim();
    const driverLicenseUrl = document.getElementById('addDriverLicenseUrlOnly').value.trim();
    
    // Get contacts from form
    const contacts = getAddDriverContactsFromForm();
    
    // Get previous trucks from form
    const previousTrucks = getAddPreviousTrucksFromForm();
    
    const submitBtn = document.getElementById('addDriverSubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Adding...';
    submitBtn.disabled = true;
    
    try {
        let driverImageUrl = null;
        
        // Upload driver image
        if (driverImageFile) {
            const fileExt = driverImageFile.name.split('.').pop();
            const fileName = `driver-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('driver-images')
                .upload(fileName, driverImageFile, {
                    upsert: true,
                    cacheControl: '3600'
                });
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
                .from('driver-images')
                .getPublicUrl(fileName);
            
            driverImageUrl = urlData.publicUrl;
        }
        
        // Generate a unique truck number for the driver without truck
        const timestamp = Date.now();
        const uniqueTruckNumber = `NO-TRUCK-${timestamp}`;
        
        console.log('Creating driver with data:', {
            driverName,
            driverLicense,
            contactsCount: contacts.length,
            previousTrucksCount: previousTrucks.length,
            hasImage: !!driverImageUrl
        });
        
        // Create new driver record
        const { data: newDriver, error: insertError } = await supabase
            .from('trucks')
            .insert({
                truck_number: uniqueTruckNumber,
                driver_name: driverName,
                driver_license: driverLicense,
                driver_license_url: driverLicenseUrl || null,
                driver_image_url: driverImageUrl,
                previous_trucks: previousTrucks.length > 0 ? previousTrucks.join(', ') : null,
                status: 'no_truck',
                // Clear truck specifications since this is just a driver
                truck_type: null,
                truck_body: null,
                truck_make: null,
                truck_tons: null,
                truck_image_url: null,
                comesa: 'NO',
                c28: 'NO',
                comesa_expiry: null,
                c28_expiry: null
            })
            .select()
            .single();
        
        if (insertError) {
            console.error('Supabase insert error:', insertError);
            throw insertError;
        }
        
        console.log('Driver created successfully:', newDriver);
        
        // Insert contacts
        if (contacts.length > 0) {
            const contactsToInsert = contacts.map(contact => ({
                truck_id: newDriver.id,
                phone_number: contact.phone,
                contact_type: 'mobile'
            }));
            
            const { error: contactsError } = await supabase
                .from('driver_contacts')
                .insert(contactsToInsert);
            
            if (contactsError) {
                console.error('Contacts insert error:', contactsError);
                throw contactsError;
            }
        }
        
        showSuccessModal('Driver added successfully to "Drivers with No Trucks" section!');
        
        // Close the modal
        closeAddDriverModal();
        
        // UPDATE LAST UPDATED DATE
        await updateLastUpdatedDate('truck-list');
        
        // Reload the no-truck section to show the new driver
        await loadTrucksByAdminStatus('no-truck');
        
    } catch (error) {
        console.error('Error adding driver:', error);
        showErrorModal('Error adding driver: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = true; // Keep disabled until form is filled again
    }
}

let editDriverImageFile = null;










// Validate Edit Driver Form
function validateEditDriverForm() {
    const driverName = document.getElementById('editDriverNameOnly').value.trim();
    const driverLicense = document.getElementById('editDriverLicenseOnly').value.trim();
    
    // Check contacts
    const contacts = getEditDriverContactsFromForm();
    const hasValidContacts = contacts.length > 0;
    
    // All required fields must be filled
    const isValid = driverName && driverLicense && hasValidContacts;
    
    return isValid;
}

// Update Edit Driver Save Button State
function updateEditDriverSaveButtonState() {
    const isValid = validateEditDriverForm();
    const submitBtn = document.getElementById('editDriverSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = !isValid;
    }
}

// Get Edit Driver Contacts from Form
function getEditDriverContactsFromForm() {
    const container = document.getElementById('editDriverContactsContainer');
    const contactGroups = container.querySelectorAll('.contact-input-group');
    
    const contacts = [];
    contactGroups.forEach(group => {
        const phoneInput = group.querySelector('.contact-input');
        const contactId = group.getAttribute('data-contact-id');
        
        if (phoneInput.value.trim()) {
            contacts.push({
                id: contactId,
                phone: phoneInput.value.trim()
            });
        }
    });
    
    return contacts;
}

// Get Edit Previous Trucks from Form
function getEditPreviousTrucksFromForm() {
    const container = document.getElementById('editPreviousTrucksContainer');
    const truckGroups = container.querySelectorAll('.previous-truck-group');
    
    const previousTrucks = [];
    truckGroups.forEach(group => {
        const truckInput = group.querySelector('.previous-truck-input');
        if (truckInput.value.trim()) {
            previousTrucks.push(truckInput.value.trim());
        }
    });
    
    return previousTrucks;
}

// Update Driver Contacts (this should already exist, but adding for completeness)
async function updateDriverContacts(truckId, contacts) {
    try {
        // Delete contacts marked for removal
        if (window.driverContactsToDelete && window.driverContactsToDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from('driver_contacts')
                .delete()
                .in('id', window.driverContactsToDelete);
            
            if (deleteError) throw deleteError;
            window.driverContactsToDelete = [];
        }
        
        // Update or insert contacts
        for (const contact of contacts) {
            if (contact.id && !contact.id.startsWith('new_')) {
                // Update existing contact
                const { error: updateError } = await supabase
                    .from('driver_contacts')
                    .update({
                        phone_number: contact.phone,
                        contact_type: 'mobile'
                    })
                    .eq('id', contact.id);
                
                if (updateError) throw updateError;
            } else {
                // Insert new contact
                const { error: insertError } = await supabase
                    .from('driver_contacts')
                    .insert({
                        truck_id: truckId,
                        phone_number: contact.phone,
                        contact_type: 'mobile'
                    });
                
                if (insertError) throw insertError;
            }
        }
    } catch (error) {
        console.error('Error updating contacts:', error);
        throw error;
    }
}

// Enhanced Load Driver Contacts for Edit Modal
async function loadDriverContactsForEdit(truckId) {
    const container = document.getElementById('editDriverContactsContainer');
    container.innerHTML = '';
    
    try {
        const { data: contacts, error } = await supabase
            .from('driver_contacts')
            .select('*')
            .eq('truck_id', truckId)
            .order('created_at');
        
        if (error) throw error;
        
        if (contacts && contacts.length > 0) {
            contacts.forEach(contact => {
                addEditDriverContactField(contact.phone_number, contact.id);
            });
        } else {
            // Add one empty contact field
            addEditDriverContactField();
        }
        
        updateEditDriverContactRemoveButtons();
        updateEditDriverSaveButtonState();
        
    } catch (error) {
        console.error('Error loading contacts:', error);
        // Add one empty contact field as fallback
        addEditDriverContactField();
        updateEditDriverContactRemoveButtons();
        updateEditDriverSaveButtonState();
    }
}

// Enhanced Load Previous Trucks for Edit Modal
async function loadPreviousTrucks(truckId) {
    const container = document.getElementById('editPreviousTrucksContainer');
    container.innerHTML = '';
    
    try {
        const { data: truck, error } = await supabase
            .from('trucks')
            .select('previous_trucks')
            .eq('id', truckId)
            .single();
        
        if (error) throw error;
        
        if (truck.previous_trucks) {
            const trucksArray = truck.previous_trucks.split(', ').filter(t => t.trim() !== '');
            trucksArray.forEach((truckNum, index) => {
                addEditPreviousTruckField(truckNum);
            });
        } else {
            // Add one empty field if no previous trucks
            addEditPreviousTruckField();
        }
        
        updateEditPreviousTruckRemoveButtons();
    } catch (error) {
        console.error('Error loading previous trucks:', error);
        // Add one empty field as fallback
        addEditPreviousTruckField();
        updateEditPreviousTruckRemoveButtons();
    }
}

// Add Edit Driver Contact Field
function addEditDriverContactField(phone = '', contactId = null) {
    const container = document.getElementById('editDriverContactsContainer');
    
    const contactGroup = document.createElement('div');
    contactGroup.className = 'contact-input-group';
    if (contactId) {
        contactGroup.setAttribute('data-contact-id', contactId);
    } else {
        contactGroup.setAttribute('data-contact-id', `new_${Date.now()}`);
    }
    
    contactGroup.innerHTML = `
        <input type="text" class="contact-input" placeholder="Phone number" value="${phone}" required oninput="updateEditDriverSaveButtonState()">
        <button type="button" class="btn-remove-contact" onclick="removeEditDriverContactField(this)">🗑️</button>
    `;
    
    container.appendChild(contactGroup);
    updateEditDriverContactRemoveButtons();
    updateEditDriverSaveButtonState();
}

// Remove Edit Driver Contact Field
function removeEditDriverContactField(button) {
    const contactGroup = button.closest('.contact-input-group');
    const container = contactGroup.parentElement;
    const contactGroups = container.querySelectorAll('.contact-input-group');
    
    const contactId = contactGroup.getAttribute('data-contact-id');
    
    // If it's an existing contact (not new), mark it for deletion
    if (contactId && !contactId.startsWith('new_')) {
        if (!window.driverContactsToDelete) {
            window.driverContactsToDelete = [];
        }
        window.driverContactsToDelete.push(contactId);
    }
    
    if (contactGroups.length > 1) {
        contactGroup.remove();
    } else {
        const contactInput = contactGroup.querySelector('.contact-input');
        contactInput.value = '';
        contactInput.focus();
    }
    
    updateEditDriverContactRemoveButtons();
    updateEditDriverSaveButtonState();
}

// Update Edit Driver Contact Remove Buttons Visibility
function updateEditDriverContactRemoveButtons() {
    const container = document.getElementById('editDriverContactsContainer');
    const contactGroups = container.querySelectorAll('.contact-input-group');
    const removeButtons = container.querySelectorAll('.btn-remove-contact');
    
    if (contactGroups.length > 1) {
        removeButtons.forEach(btn => btn.style.display = 'inline-block');
    } else {
        removeButtons.forEach(btn => btn.style.display = 'none');
    }
}

// Add Edit Previous Truck Field
function addEditPreviousTruckField(truckNumber = '') {
    const container = document.getElementById('editPreviousTrucksContainer');
    
    const truckGroup = document.createElement('div');
    truckGroup.className = 'previous-truck-group';
    truckGroup.setAttribute('data-truck-index', `new_${Date.now()}`);
    
    truckGroup.innerHTML = `
        <input type="text" class="previous-truck-input" placeholder="Truck Number" value="${truckNumber}">
        <button type="button" class="btn-remove-truck" onclick="removeEditPreviousTruckField(this)">🗑️</button>
    `;
    
    container.appendChild(truckGroup);
    updateEditPreviousTruckRemoveButtons();
}

// Remove Edit Previous Truck Field
function removeEditPreviousTruckField(button) {
    const truckGroup = button.closest('.previous-truck-group');
    const container = truckGroup.parentElement;
    const truckGroups = container.querySelectorAll('.previous-truck-group');
    
    if (truckGroups.length > 1) {
        truckGroup.remove();
    } else {
        const truckInput = truckGroup.querySelector('.previous-truck-input');
        truckInput.value = '';
        truckInput.focus();
    }
    
    updateEditPreviousTruckRemoveButtons();
}

// Update Edit Previous Truck Remove Buttons Visibility
function updateEditPreviousTruckRemoveButtons() {
    const container = document.getElementById('editPreviousTrucksContainer');
    const truckGroups = container.querySelectorAll('.previous-truck-group');
    const removeButtons = container.querySelectorAll('.btn-remove-truck');
    
    if (truckGroups.length > 1) {
        removeButtons.forEach(btn => btn.style.display = 'inline-block');
    } else {
        removeButtons.forEach(btn => btn.style.display = 'none');
    }
}

// Enhanced Preview Edit Driver Image - replaces old image with new preview
function previewEditDriverImage(input) {
    const currentImage = document.getElementById('currentDriverImageOnly');
    const file = input.files[0];
    
    if (file) {
        editDriverImageFile = file;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Replace the current image with the new preview
            currentImage.src = e.target.result;
            currentImage.style.display = 'block';
        }
        
        reader.readAsDataURL(file);
    } else {
        // If no file selected, keep the original image
        editDriverImageFile = null;
    }
    
    updateEditDriverSaveButtonState();
}

// Enhanced Handle Edit Driver Form Submit with Image Replacement
async function handleEditDriverSubmit(event) {
    event.preventDefault();
    
    if (!validateEditDriverForm()) {
        alert('Please fill all required fields');
        return;
    }
    
    const driverId = document.getElementById('editDriverId').value;
    const driverName = document.getElementById('editDriverNameOnly').value;
    const driverLicense = document.getElementById('editDriverLicenseOnly').value;
    const driverLicenseUrl = document.getElementById('editDriverLicenseUrlOnly').value;
    
    // Get contacts from form
    const contacts = getEditDriverContactsFromForm();
    
    // Get previous trucks from form
    const previousTrucks = getEditPreviousTrucksFromForm();
    
    const submitBtn = document.getElementById('editDriverSubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Saving...';
    submitBtn.disabled = true;
    
    try {
        let driverImageUrl = null;
        
        // Get current image URL to preserve if no new file is uploaded
        const currentDriverImage = document.getElementById('currentDriverImageOnly');
        
        // If new image was uploaded, upload it and get new URL
        if (editDriverImageFile) {
            const fileExt = editDriverImageFile.name.split('.').pop();
            const fileName = `driver-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('driver-images')
                .upload(fileName, editDriverImageFile, {
                    upsert: true,
                    cacheControl: '3600'
                });
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
                .from('driver-images')
                .getPublicUrl(fileName);
            
            driverImageUrl = urlData.publicUrl;
        } else if (currentDriverImage.style.display !== 'none') {
            // Keep the current image if no new file was uploaded
            driverImageUrl = currentDriverImage.src;
        }
        
        // Update driver record
        const updateData = {
            driver_name: driverName,
            driver_license: driverLicense,
            driver_license_url: driverLicenseUrl || null,
            previous_trucks: previousTrucks.length > 0 ? previousTrucks.join(', ') : null,
            driver_image_url: driverImageUrl
        };
        
        const { error: updateError } = await supabase
            .from('trucks')
            .update(updateData)
            .eq('id', driverId);
        
        if (updateError) throw updateError;
        
        // Update contacts
        await updateDriverContacts(driverId, contacts);
        
        showSuccessModal('Driver details updated successfully!');
        document.getElementById('editDriverModal').style.display = 'none';
        
        // Reset edit image file
        editDriverImageFile = null;
        
        // UPDATE LAST UPDATED DATE
        await updateLastUpdatedDate('truck-list');
        
        // Reload the appropriate tab
        const activeAdminTab = document.querySelector('.admin-tab-content.active').id;
        loadTrucksByAdminStatus(activeAdminTab);
        
    } catch (error) {
        console.error('Error updating driver details:', error);
        showErrorModal('Error updating driver details: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}