/**
 * Storage Manager
 * Handles all local storage operations for the application
 */

const StorageManager = (() => {
    // Storage keys
    const KEYS = {
        CURRENT_USER: 'whatsapp_clone_user',
        CHAT_LIST: 'whatsapp_clone_chats',
        THEME: 'whatsapp_clone_theme'
    };

    /**
     * Save the current user to local storage
     * @param {Object} user - User object
     */
    function saveCurrentUser(user) {
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    }

    /**
     * Get the current user from local storage
     * @returns {Object|null} - User object or null if not found
     */
    function getCurrentUser() {
        const userData = localStorage.getItem(KEYS.CURRENT_USER);
        return userData ? JSON.parse(userData) : null;
    }

    /**
     * Save the chat list to local storage
     * @param {Array} chatList - Array of chat objects
     */
    function saveChatList(chatList) {
        localStorage.setItem(KEYS.CHAT_LIST, JSON.stringify(chatList));
    }

    /**
     * Get the chat list from local storage
     * @returns {Array} - Array of chat objects
     */
    function getChatList() {
        const chatListData = localStorage.getItem(KEYS.CHAT_LIST);
        return chatListData ? JSON.parse(chatListData) : [];
    }

    /**
     * Save a theme preference to local storage
     * @param {string} theme - Theme name
     */
    function saveTheme(theme) {
        localStorage.setItem(KEYS.THEME, theme);
    }

    /**
     * Get the saved theme from local storage
     * @returns {string|null} - Theme name or null if not found
     */
    function getTheme() {
        return localStorage.getItem(KEYS.THEME);
    }

    /**
     * Clear all application data from local storage
     */
    function clearAllData() {
        localStorage.removeItem(KEYS.CURRENT_USER);
        localStorage.removeItem(KEYS.CHAT_LIST);
        localStorage.removeItem(KEYS.THEME);
    }

    // Public API
    return {
        saveCurrentUser,
        getCurrentUser,
        saveChatList,
        getChatList,
        saveTheme,
        getTheme,
        clearAllData
    };
})();
