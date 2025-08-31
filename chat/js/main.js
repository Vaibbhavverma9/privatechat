// Global state
const state = {
    activeRoom: null,
    rooms: [],
    messages: {},
    eventSources: {},
    attachmentData: null,
    attachmentType: null // 'file' or 'url'
};

// DOM elements
const elements = {
    chatRooms: document.getElementById('chat-rooms'),
    chatHeader: document.getElementById('chat-header'),
    chatNtfyUrl: document.getElementById('chat-ntfy-url'),
    chatMessages: document.getElementById('chat-messages'),
    messageForm: document.getElementById('message-form'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    attachmentBtn: document.getElementById('attachment-btn'),
    attachmentDropdown: document.getElementById('attachment-dropdown'),
    attachmentFileInput: document.getElementById('attachment-file-input'),
    attachmentPreview: document.getElementById('attachment-preview'),
    attachmentName: document.getElementById('attachment-name'),
    attachmentRemove: document.getElementById('attachment-remove'),
    addRoomBtn: document.getElementById('add-room-btn'),
    addRoomModal: document.getElementById('add-room-modal'),
    addRoomForm: document.getElementById('add-room-form'),
    ntfyUrlInput: document.getElementById('ntfy-url-input'),
    roomNameInput: document.getElementById('room-name-input'),
    modalClose: document.getElementById('modal-close'),
    urlAttachmentModal: document.getElementById('url-attachment-modal'),
    urlAttachmentForm: document.getElementById('url-attachment-form'),
    urlAttachmentInput: document.getElementById('url-attachment-input'),
    urlModalClose: document.getElementById('url-modal-close'),
    emptyState: document.getElementById('empty-state')
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    setupMessageInteractions();
});

// Initialize the app
function initApp() {
    // Load rooms from localStorage
    loadRooms();
    
    // Add default room if no rooms exist
    if (state.rooms.length === 0) {
        addRoom('Chat With Veb', 'https://ntfy.sh/veb');
    }
    
    // Render rooms
    renderRooms();
    
    // Select first room by default
    if (state.rooms.length > 0 && !state.activeRoom) {
        selectRoom(state.rooms[0].id);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Message form submission
    elements.messageForm.addEventListener('submit', sendMessage);
    
    // Message input typing
    elements.messageInput.addEventListener('input', handleMessageInput);
    
    // Attachment button click
    elements.attachmentBtn.addEventListener('click', toggleAttachmentDropdown);
    
    // Document click to close attachment dropdown
    document.addEventListener('click', (e) => {
        if (!elements.attachmentBtn.contains(e.target) && !elements.attachmentDropdown.contains(e.target)) {
            elements.attachmentDropdown.classList.remove('active');
        }
    });
    
    // File attachment input change
    elements.attachmentFileInput.addEventListener('change', handleFileAttachment);
    
    // Attachment remove button click
    elements.attachmentRemove.addEventListener('click', removeAttachment);
    
    // Add room button click
    elements.addRoomBtn.addEventListener('click', () => {
        elements.addRoomModal.classList.add('active');
    });
    
    // Add room form submission
    elements.addRoomForm.addEventListener('submit', handleAddRoom);
    
    // Modal close button click
    elements.modalClose.addEventListener('click', () => {
        elements.addRoomModal.classList.remove('active');
        resetAddRoomForm();
    });
    
    // URL attachment option click
    document.getElementById('attachment-url').addEventListener('click', () => {
        elements.attachmentDropdown.classList.remove('active');
        elements.urlAttachmentModal.classList.add('active');
    });
    
    // File attachment option click
    document.getElementById('attachment-file').addEventListener('click', () => {
        elements.attachmentDropdown.classList.remove('active');
        elements.attachmentFileInput.click();
    });
    
    // URL attachment form submission
    elements.urlAttachmentForm.addEventListener('submit', handleUrlAttachment);
    
    // URL modal close button click
    elements.urlModalClose.addEventListener('click', () => {
        elements.urlAttachmentModal.classList.remove('active');
        elements.urlAttachmentInput.value = '';
    });
}

// Load chat rooms from localStorage
function loadRooms() {
    const storedRooms = localStorage.getItem('chatRooms');
    if (storedRooms) {
        state.rooms = JSON.parse(storedRooms);
    }
}

// Save chat rooms to localStorage
function saveRooms() {
    localStorage.setItem('chatRooms', JSON.stringify(state.rooms));
}

// Render chat rooms
function renderRooms() {
    elements.chatRooms.innerHTML = '';
    
    state.rooms.forEach(room => {
        const roomElement = document.createElement('div');
        roomElement.className = `chat-room ${state.activeRoom === room.id ? 'active' : ''}`;
        roomElement.dataset.id = room.id;
        roomElement.innerHTML = `
            <h3>${room.name}</h3>
            <p class="chat-room-url">${room.ntfyUrl}</p>
        `;
        roomElement.addEventListener('click', () => selectRoom(room.id));
        elements.chatRooms.appendChild(roomElement);
    });
}

// Select a chat room
function selectRoom(roomId) {
    // Close existing EventSource
    if (state.activeRoom && state.eventSources[state.activeRoom]) {
        state.eventSources[state.activeRoom].close();
    }
    
    state.activeRoom = roomId;
    
    // Find the selected room
    const room = state.rooms.find(r => r.id === roomId);
    
    if (!room) return;
    
    // Update room selection UI
    document.querySelectorAll('.chat-room').forEach(el => {
        el.classList.toggle('active', el.dataset.id === roomId);
    });
    
    // Update chat header
    elements.chatHeader.innerHTML = `<h2>${room.name}</h2>`;
    elements.chatNtfyUrl.textContent = room.ntfyUrl;
    
    // Toggle empty state
    toggleEmptyState(false);
    
    // Load messages from localStorage
    loadMessages(roomId);
    
    // Render messages
    renderMessages();
    
    // Connect to ntfy.sh for this room
    connectToNtfy(room.ntfyUrl, roomId);
}

// Add a new chat room
function addRoom(name, ntfyUrl) {
    const id = Date.now().toString();
    
    // Check if ntfyUrl is already in use
    const isDuplicate = state.rooms.some(room => room.ntfyUrl === ntfyUrl);
    if (isDuplicate) {
        showToast('Error', 'This ntfy.sh URL is already in use in another chat room.', 'error');
        return false;
    }
    
    const newRoom = { id, name, ntfyUrl };
    state.rooms.push(newRoom);
    
    // Save rooms to localStorage
    saveRooms();
    
    // Initialize messages array for this room
    if (!state.messages[id]) {
        state.messages[id] = [];
    }
    
    return true;
}

// Handle adding a new room
function handleAddRoom(e) {
    e.preventDefault();
    
    const name = elements.roomNameInput.value.trim();
    let ntfyUrl = elements.ntfyUrlInput.value.trim();
    
    // Validate input
    if (!name || !ntfyUrl) {
        showToast('Error', 'Please fill in all fields.', 'error');
        return;
    }
    
    // Ensure URL is properly formatted
    if (!ntfyUrl.startsWith('https://')) {
        ntfyUrl = `https://${ntfyUrl}`;
    }

    // Validate the ntfy URL
    validateNtfyUrl(ntfyUrl)
        .then(valid => {
            if (valid) {
                // Add the room
                if (addRoom(name, ntfyUrl)) {
                    // Render rooms
                    renderRooms();
                    
                    // Select the new room
                    selectRoom(state.rooms[state.rooms.length - 1].id);
                    
                    // Close modal
                    elements.addRoomModal.classList.remove('active');
                    
                    // Reset form
                    resetAddRoomForm();
                    
                    showToast('Success', 'Chat room added successfully!', 'success');
                }
            }
        });
}

// Reset add room form
function resetAddRoomForm() {
    elements.roomNameInput.value = '';
    elements.ntfyUrlInput.value = '';
    document.getElementById('ntfy-url-error').textContent = '';
}

// Validate ntfy.sh URL
async function validateNtfyUrl(url) {
    try {
        const response = await fetch('/validate-ntfy-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ntfy_url: url })
        });
        
        const data = await response.json();
        
        if (!data.valid) {
            document.getElementById('ntfy-url-error').textContent = data.error;
            return false;
        }
        
        document.getElementById('ntfy-url-error').textContent = '';
        return true;
    } catch (error) {
        console.error('Error validating ntfy URL:', error);
        document.getElementById('ntfy-url-error').textContent = 'Error validating URL. Please try again.';
        return false;
    }
}

// Connect to ntfy.sh for real-time messages
function connectToNtfy(ntfyUrl, roomId) {
    // Parse the URL to get the topic
    const url = new URL(ntfyUrl);
    const topic = url.pathname.substring(1); // Remove leading slash
    
    if (!topic) return;
    
    // Create EventSource connection
    const eventSource = new EventSource(`https://ntfy.sh/${topic}/sse`);
    
    // Store the EventSource instance
    state.eventSources[roomId] = eventSource;
    
    // Listen for messages
    eventSource.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // Skip messages we've already seen
            const existingMessage = state.messages[roomId].find(m => m.id === data.id);
            if (existingMessage) return;
            
            // Add message to the room's messages
            const message = {
                id: data.id,
                content: data.message,
                timestamp: data.time * 1000, // Convert to milliseconds
                attachment: data.attachment ? {
                    url: data.attachment.url,
                    name: data.attachment.name
                } : null,
                isOutgoing: false
            };
            
            // Add message to state
            state.messages[roomId].push(message);
            
            // Save messages to localStorage
            saveMessages(roomId);
            
            // Render new message
            renderNewMessage(message);
        } catch (error) {
            console.error('Error processing ntfy message:', error);
        }
    });
    
    // Handle connection errors
    eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        // Try to reconnect after a delay
        setTimeout(() => {
            if (state.activeRoom === roomId) {
                connectToNtfy(ntfyUrl, roomId);
            }
        }, 5000);
    };
}

// Load messages from localStorage
function loadMessages(roomId) {
    const storedMessages = localStorage.getItem(`chatMessages_${roomId}`);
    if (storedMessages) {
        state.messages[roomId] = JSON.parse(storedMessages);
    } else {
        state.messages[roomId] = [];
    }
}

// Save messages to localStorage
function saveMessages(roomId) {
    localStorage.setItem(`chatMessages_${roomId}`, JSON.stringify(state.messages[roomId]));
}

// Render all messages for the active room
function renderMessages() {
    elements.chatMessages.innerHTML = '';
    
    if (!state.activeRoom || !state.messages[state.activeRoom]) return;
    
    const messages = state.messages[state.activeRoom];
    
    if (messages.length === 0) {
        toggleEmptyState(true);
        return;
    }
    
    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        elements.chatMessages.appendChild(messageElement);
    });
    
    // Scroll to bottom
    scrollToBottom();
}

// Render a new message
function renderNewMessage(message) {
    const messageElement = createMessageElement(message);
    elements.chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    scrollToBottom();
}

// Create a message element
function createMessageElement(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.isOutgoing ? 'outgoing' : 'incoming'}`;
    
    // Add data attributes for message interaction functionality
    messageElement.setAttribute('data-message-id', message.id);
    messageElement.setAttribute('data-sender-id', getUserId());
    messageElement.setAttribute('data-timestamp', message.timestamp);
    
    let attachmentHtml = '';
    if (message.attachment) {
        attachmentHtml = `
            <div class="message-attachment">
                <i class="fas fa-paperclip"></i>
                <a href="${message.attachment.url}" target="_blank">${message.attachment.name || 'Attachment'}</a>
            </div>
        `;
    }
    
    // Generate reactions HTML if message has reactions
    let reactionsHtml = '';
    if (message.reactions && message.reactions.length > 0) {
        // Group reactions by emoji
        const reactionGroups = {};
        message.reactions.forEach(reaction => {
            if (!reactionGroups[reaction.emoji]) {
                reactionGroups[reaction.emoji] = [];
            }
            reactionGroups[reaction.emoji].push(reaction);
        });
        
        // Create reactions HTML
        reactionsHtml = '<div class="message-reactions">';
        Object.keys(reactionGroups).forEach(emoji => {
            const group = reactionGroups[emoji];
            const usernames = group.map(r => r.username).join(', ');
            
            reactionsHtml += `
                <div class="message-reaction" title="${usernames}">
                    <span class="message-reaction-emoji">${emoji}</span>
                    <span class="message-reaction-count">${group.length}</span>
                </div>
            `;
        });
        reactionsHtml += '</div>';
    }
    
    // Build message HTML
    messageElement.innerHTML = `
        <div class="message-bubble">
            <div class="message-content">${message.content}</div>
            ${attachmentHtml}
            ${reactionsHtml}
            <div class="message-meta">
                <span class="message-time">${formatTimestamp(message.timestamp)}</span>
                ${message.isOutgoing ? `<span class="message-status">${getStatusIcon(message.status || 'sent')}</span>` : ''}
            </div>
        </div>
    `;
    
    return messageElement;
}

// Get status icon for messages
function getStatusIcon(status) {
    switch (status) {
        case 'sending':
            return '<i class="far fa-clock"></i>';
        case 'sent':
            return '<i class="fas fa-check"></i>';
        case 'delivered':
            return '<i class="fas fa-check-double"></i>';
        case 'read':
            return '<i class="fas fa-check-double" style="color: var(--primary);"></i>';
        case 'failed':
            return '<i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>';
        default:
            return '';
    }
}

// Send a message
async function sendMessage(e) {
    e.preventDefault();
    
    const messageText = elements.messageInput.value.trim();
    if (!messageText && !state.attachmentData) return;
    
    // Get active room
    const room = state.rooms.find(r => r.id === state.activeRoom);
    if (!room) return;
    
    try {
        const formData = new FormData();
        formData.append('ntfy_url', room.ntfyUrl);
        formData.append('message', messageText);
        
        // Add attachment if exists
        if (state.attachmentData) {
            if (state.attachmentType === 'url') {
                formData.append('attachment_url', state.attachmentData);
            } else if (state.attachmentType === 'file') {
                // We already have the file data in base64 format from handleFileAttachment
                // Just send the URL to the server
                formData.append('attachment_url', state.attachmentData.fileData);
            }
        }
        
        // Send message to server
        const response = await fetch('/send-message', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            // Add message to local state
            const message = {
                id: Date.now().toString(),
                content: messageText,
                timestamp: Date.now(),
                attachment: state.attachmentData && state.attachmentType === 'url' ? {
                    url: state.attachmentData,
                    name: getFilenameFromUrl(state.attachmentData)
                } : state.attachmentData && state.attachmentType === 'file' ? {
                    url: '#',
                    name: state.attachmentData.filename
                } : null,
                isOutgoing: true
            };
            
            state.messages[state.activeRoom].push(message);
            saveMessages(state.activeRoom);
            
            // Render new message
            renderNewMessage(message);
            
            // Clear input and attachment
            elements.messageInput.value = '';
            removeAttachment();
            
            // Update send button state
            updateSendButtonState();
        } else {
            const error = await response.json();
            showToast('Error', error.error || 'Failed to send message', 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Error', 'Failed to send message. Please try again.', 'error');
    }
}

// Handle message input
function handleMessageInput() {
    // Auto-grow textarea
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = `${Math.min(elements.messageInput.scrollHeight, 120)}px`;
    
    // Update send button state
    updateSendButtonState();
    
    // Send typing indicator when user is typing
    if (elements.messageInput.value.trim().length > 0 && state.activeRoom) {
        // Find the room object
        const room = state.rooms.find(r => r.id === state.activeRoom);
        if (room) {
            // Throttle typing indicator to avoid sending too many
            if (!window.typingIndicatorTimeout) {
                sendTypingIndicator(room.ntfyUrl);
                
                // Set throttle timeout
                window.typingIndicatorTimeout = setTimeout(() => {
                    window.typingIndicatorTimeout = null;
                }, 3000); // Only send typing indicator once every 3 seconds
            }
        }
    }
}

// Update send button state
function updateSendButtonState() {
    const hasContent = elements.messageInput.value.trim() !== '' || state.attachmentData !== null;
    elements.sendBtn.disabled = !hasContent;
}

// Toggle attachment dropdown
function toggleAttachmentDropdown(e) {
    e.preventDefault();
    elements.attachmentDropdown.classList.toggle('active');
}

// Handle file attachment
function handleFileAttachment(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Show loading state
    elements.attachmentPreview.style.display = 'flex';
    elements.attachmentName.textContent = 'Uploading...';
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload file
    fetch('/upload-file', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Store attachment data
            state.attachmentData = data;
            state.attachmentType = 'file';
            
            // Update attachment preview
            elements.attachmentName.textContent = data.filename;
            elements.attachmentPreview.style.display = 'flex';
            
            // Update send button state
            updateSendButtonState();
        } else {
            showToast('Error', data.error || 'Failed to upload file', 'error');
            elements.attachmentPreview.style.display = 'none';
        }
    })
    .catch(error => {
        console.error('Error uploading file:', error);
        showToast('Error', 'Failed to upload file. Please try again.', 'error');
        elements.attachmentPreview.style.display = 'none';
    });
    
    // Reset file input
    e.target.value = '';
}

// Handle URL attachment
function handleUrlAttachment(e) {
    e.preventDefault();
    
    const url = elements.urlAttachmentInput.value.trim();
    if (!url) return;
    
    // Validate URL
    if (!isValidUrl(url)) {
        showToast('Error', 'Please enter a valid URL', 'error');
        return;
    }
    
    // Store attachment data
    state.attachmentData = url;
    state.attachmentType = 'url';
    
    // Update attachment preview
    elements.attachmentName.textContent = getFilenameFromUrl(url);
    elements.attachmentPreview.style.display = 'flex';
    
    // Close modal
    elements.urlAttachmentModal.classList.remove('active');
    elements.urlAttachmentInput.value = '';
    
    // Update send button state
    updateSendButtonState();
}

// Remove attachment
function removeAttachment() {
    state.attachmentData = null;
    state.attachmentType = null;
    elements.attachmentPreview.style.display = 'none';
    
    // Update send button state
    updateSendButtonState();
}

// Toggle empty state
function toggleEmptyState(show) {
    if (show) {
        elements.emptyState.style.display = 'flex';
        elements.chatMessages.style.display = 'none';
    } else {
        elements.emptyState.style.display = 'none';
        elements.chatMessages.style.display = 'flex';
    }
}

// Show toast notification
function showToast(title, message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">×</button>
    `;
    
    // Add toast to document
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide toast after 3 seconds
    const timeout = setTimeout(() => {
        removeToast(toast);
    }, 3000);
    
    // Close button click
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(timeout);
        removeToast(toast);
    });
}

// Remove toast
function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// Utility functions
function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function getFilenameFromUrl(url) {
    try {
        const parsedUrl = new URL(url);
        const pathname = parsedUrl.pathname;
        const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
        return filename || 'Attachment';
    } catch (_) {
        return 'Attachment';
    }
}

// Send typing indicator to NTFY
function sendTypingIndicator(ntfyUrl) {
    try {
        // Create typing indicator message
        const message = {
            type: 'typing',
            userId: getUserId(),
            username: getUserName(),
            timestamp: Date.now()
        };
        
        // Send to NTFY server
        fetch('/api/send-ntfy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ntfy_url: ntfyUrl,
                message: JSON.stringify(message)
            })
        }).catch(error => {
            console.error('Error sending typing indicator:', error);
        });
    } catch (error) {
        console.error('Error creating typing indicator:', error);
    }
}

// Send read receipt for a message
function sendReadReceipt(ntfyUrl, messageId) {
    try {
        // Create read receipt message
        const message = {
            type: 'read_receipt',
            messageId: messageId,
            userId: getUserId(),
            username: getUserName(),
            timestamp: Date.now()
        };
        
        // Send to NTFY server
        fetch('/api/send-ntfy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ntfy_url: ntfyUrl,
                message: JSON.stringify(message)
            })
        }).catch(error => {
            console.error('Error sending read receipt:', error);
        });
    } catch (error) {
        console.error('Error creating read receipt:', error);
    }
}

// Get user ID from storage or create new one
function getUserId() {
    let userId = localStorage.getItem('user_id');
    if (!userId) {
        userId = generateId();
        localStorage.setItem('user_id', userId);
    }
    return userId;
}

// Get user name from storage or create default
function getUserName() {
    let username = localStorage.getItem('username');
    if (!username) {
        username = 'User_' + Math.floor(Math.random() * 10000);
        localStorage.setItem('username', username);
    }
    return username;
}

// Generate random ID
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Setup message interactions (long press, etc.)
function setupMessageInteractions() {
    // Variables to track long press
    let longPressTimer;
    let isLongPress = false;
    const longPressDuration = 500; // ms to trigger long press
    
    // Track touch/mouse position for detecting movement
    let touchStartX = 0;
    let touchStartY = 0;
    const maxMoveDistance = 10; // max pixels to still consider it a long press
    
    // Chat messages container
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // Add touch/mouse event listeners
    chatMessages.addEventListener('touchstart', handleTouchStart);
    chatMessages.addEventListener('touchend', handleTouchEnd);
    chatMessages.addEventListener('touchmove', handleTouchMove);
    chatMessages.addEventListener('touchcancel', cancelLongPress);
    
    chatMessages.addEventListener('mousedown', handleMouseDown);
    chatMessages.addEventListener('mouseup', handleMouseUp);
    chatMessages.addEventListener('mouseleave', cancelLongPress);
    chatMessages.addEventListener('mousemove', handleMouseMove);
    
    // Touch event handlers
    function handleTouchStart(e) {
        const messageElement = findParentMessage(e.target);
        if (!messageElement) return;
        
        // Store touch position
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        
        // Start long press timer
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            triggerLongPress(messageElement);
        }, longPressDuration);
    }
    
    function handleTouchMove(e) {
        // If moved too far, cancel long press
        const moveX = Math.abs(e.touches[0].clientX - touchStartX);
        const moveY = Math.abs(e.touches[0].clientY - touchStartY);
        
        if (moveX > maxMoveDistance || moveY > maxMoveDistance) {
            cancelLongPress();
        }
    }
    
    function handleTouchEnd(e) {
        // Cancel long press timer
        clearTimeout(longPressTimer);
        
        // Prevent default click if this was a long press
        if (isLongPress) {
            e.preventDefault();
            isLongPress = false;
        }
    }
    
    // Mouse event handlers
    function handleMouseDown(e) {
        const messageElement = findParentMessage(e.target);
        if (!messageElement) return;
        
        // Store position
        touchStartX = e.clientX;
        touchStartY = e.clientY;
        
        // Start long press timer
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            triggerLongPress(messageElement);
        }, longPressDuration);
    }
    
    function handleMouseMove(e) {
        // If moved too far, cancel long press
        const moveX = Math.abs(e.clientX - touchStartX);
        const moveY = Math.abs(e.clientY - touchStartY);
        
        if (moveX > maxMoveDistance || moveY > maxMoveDistance) {
            cancelLongPress();
        }
    }
    
    function handleMouseUp(e) {
        // Cancel long press timer
        clearTimeout(longPressTimer);
        
        // Prevent default click if this was a long press
        if (isLongPress) {
            e.preventDefault();
            isLongPress = false;
        }
    }
    
    // Cancel long press
    function cancelLongPress() {
        clearTimeout(longPressTimer);
        isLongPress = false;
    }
    
    // Trigger long press action
    function triggerLongPress(messageElement) {
        // Show message options menu
        UIManager.showMessageOptions(messageElement);
    }
    
    // Find parent message element
    function findParentMessage(element) {
        while (element && !element.classList.contains('message')) {
            element = element.parentElement;
        }
        return element;
    }
}
