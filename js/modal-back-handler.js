// modal-back-handler.js - Hardware back button handler for modals
// Add this as a separate script, no changes needed to existing code

(function() {
    'use strict';
    
    let modalHistoryState = null;
    
    function isModalOpen() {
        // Check if any modal is visible
        const modals = document.querySelectorAll('.modal');
        for (let modal of modals) {
            if (modal.style.display === 'block') {
                return modal;
            }
        }
        return null;
    }
    
    function closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            
            // Also trigger any existing close handlers if they exist
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.click();
            }
            
            // Dispatch custom event in case other scripts are listening
            modal.dispatchEvent(new Event('modalClosed', { bubbles: true }));
        }
    }
    
    function handleBackButton() {
        const openModal = isModalOpen();
        
        if (openModal) {
            // Close the modal
            closeModal(openModal);
            
            // Prevent actual back navigation by pushing new state
            if (modalHistoryState === null) {
                history.pushState({ modalBack: true }, '');
            }
            
            return true; // Modal was open and closed
        }
        
        return false; // No modal was open
    }
    
    // Initialize the back button handler
    function initModalBackHandler() {
        // Listen for back/forward browser navigation
        window.addEventListener('popstate', function(event) {
            // If we have our modal state, handle back button
            if (event.state && event.state.modalBack) {
                handleBackButton();
            } else {
                // Regular back button press - check if modal is open
                if (handleBackButton()) {
                    // Modal was closed, prevent further back navigation
                    history.pushState({ modalBack: true }, '');
                }
            }
        });
        
        // Push initial state to history stack
        history.replaceState({ modalBack: true }, '');
        
        // Also handle hardware back button on mobile
        document.addEventListener('backbutton', handleBackButton, false);
        
        console.log('Modal back button handler initialized');
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModalBackHandler);
    } else {
        initModalBackHandler();
    }
    
    // Make functions available globally if needed
    window.ModalBackHandler = {
        isModalOpen: isModalOpen,
        handleBackButton: handleBackButton,
        closeModal: closeModal
    };
})();