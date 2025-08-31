/**
 * Main Application Script
 * Controls the application flow and initializes all components
 */

// Global state
const state = {
    currentUser: null,
    activeChat: null,
    chatList: [],
    isInitialized: false
};

// Profile pictures
const profilePictures = [
    "https://cdn-icons-png.flaticon.com/128/17734/17734809.png",
    "https://cdn-icons-png.flaticon.com/128/17734/17734811.png",
    "https://cdn-icons-png.flaticon.com/512/17734/17734808.png",
    "https://cdn-icons-png.flaticon.com/512/17734/17734790.png",
    "https://cdn-icons-png.flaticon.com/512/18020/18020047.png",
    "https://cdn-icons-png.flaticon.com/512/218/218151.png",
    "https://cdn-icons-png.flaticon.com/512/924/924915.png",
    "https://cdn-icons-png.flaticon.com/512/4500/4500180.png",
    "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
    "https://cdn-icons-png.flaticon.com/512/599/599944.png",
    "https://cdn-icons-png.flaticon.com/512/1404/1404945.png"
];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Initialize current user if not exists
    if (!StorageManager.getCurrentUser()) {
        const userId = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        const profilePic = profilePictures[Math.floor(Math.random() * profilePictures.length)];
        const user = {
            id: userId,
            username: `User${userId}`,
            avatar: profilePic
        };
        StorageManager.saveCurrentUser(user);
    }
    
    state.currentUser = StorageManager.getCurrentUser();
    
    // Update UI with user info
    document.getElementById('current-user-avatar').src = state.currentUser.avatar;
    document.getElementById('current-username').textContent = state.currentUser.username;
    
    // Load chat list from storage
    const savedChats = StorageManager.getChatList();
    if (savedChats && savedChats.length > 0) {
        state.chatList = savedChats;
    } else {
        // Start with an empty chat list if none saved
        state.chatList = [];
        StorageManager.saveChatList(state.chatList);
    }
    
    // Render chat list in UI
    UIManager.renderChatList(state.chatList);
    
    // Set theme from storage
    const savedTheme = StorageManager.getTheme() || 'dark';
    UIManager.setTheme(savedTheme);
    
    // Always create a default chat
    console.log("Creating default chat");
    createNewChat('ntfy.sh/veb', 'WhatsApp Clone Default');
    
    // Initialize emoji picker
    if (typeof EmojiManager !== 'undefined') {
        EmojiManager.initEmojiPicker();
    }
    
    // Initialize attachment options
    if (typeof AttachmentManager !== 'undefined') {
        AttachmentManager.initAttachmentOptions();
    }
    
    state.isInitialized = true;
}

/**
 * Setup event listeners for UI elements
 */
function setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        UIManager.setTheme(newTheme);
        StorageManager.saveTheme(newTheme);
    });
    
    // New chat button
    document.getElementById('new-chat-btn').addEventListener('click', () => {
        UIManager.showModal('new-chat-modal');
        document.getElementById('ntfy-channel').focus();
    });
    
    // Create chat button in modal
    document.getElementById('create-chat-btn').addEventListener('click', () => {
        const channel = document.getElementById('ntfy-channel').value.trim();
        const chatName = document.getElementById('chat-name').value.trim() || channel;
        
        if (channel) {
            createNewChat(channel, chatName);
            UIManager.hideModal('new-chat-modal');
        } else {
            alert('Please enter a valid NTFY channel');
        }
    });
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            UIManager.hideAllModals();
        });
    });
    
    // Send message button
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    
    // Send on Enter key
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Media preview click handler
    document.addEventListener('click', (e) => {
        if (e.target.closest('.media-preview')) {
            const mediaElement = e.target.closest('.media-preview');
            UIManager.showMediaPreview(mediaElement);
        }
    });
    
    // Search in chats
    document.getElementById('search-chat').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        UIManager.filterChatList(searchTerm);
        
        // Toggle clear button
        document.getElementById('clear-search').style.display = searchTerm ? 'block' : 'none';
    });
    
    // Clear search
    document.getElementById('clear-search').addEventListener('click', () => {
        document.getElementById('search-chat').value = '';
        UIManager.filterChatList('');
        document.getElementById('clear-search').style.display = 'none';
    });
    
    // Window resize handler for responsiveness
    window.addEventListener('resize', UIManager.handleResize);
}

/**
 * Create a new chat and add it to the chat list
 * @param {string} channel - NTFY channel name
 * @param {string} name - Display name for the chat
 */
function createNewChat(channel, name) {
    // Check if chat already exists
    const existingChat = state.chatList.find(chat => chat.channel === channel);
    if (existingChat) {
        selectChat(existingChat);
        return;
    }
    
    // Generate random avatar for the chat
    const avatar = profilePictures[Math.floor(Math.random() * profilePictures.length)];
    
    // Create new chat object
    const newChat = {
        id: Date.now().toString(),
        name: name,
        channel: channel,
        avatar: avatar,
        messages: [],
        lastMessage: null,
        unreadCount: 0
    };
    
    // Add to state and save to storage
    state.chatList.unshift(newChat);
    StorageManager.saveChatList(state.chatList);
    
    // Update UI
    UIManager.renderChatList(state.chatList);
    selectChat(newChat);
    
    // Connect to NTFY channel
    NtfyManager.subscribeToChannel(newChat.channel, handleNewMessage);
}

/**
 * Select a chat and display its messages
 * @param {Object} chat - Chat object to select
 */
function selectChat(chat) {
    console.log("selectChat function called with chat:", chat.name);
    
    // Disconnect from previous channel if exists
    if (state.activeChat) {
        NtfyManager.unsubscribeFromChannel(state.activeChat.channel);
    }
    
    state.activeChat = chat;
    
    // Reset unread count
    if (chat.unreadCount > 0) {
        chat.unreadCount = 0;
        StorageManager.saveChatList(state.chatList);
        UIManager.renderChatList(state.chatList);
    }
    
    // Update UI
    UIManager.displayChat(chat);
    
    // Connect to NTFY channel
    NtfyManager.subscribeToChannel(chat.channel, handleNewMessage);
}

// Make selectChat function global so it can be accessed from UI.js
window.selectChat = selectChat;

/**
 * Send a message in the active chat
 */
function sendMessage() {
    const input = document.getElementById('message-input');
    const messageText = input.value.trim();
    
    if (!messageText || !state.activeChat) return;
    
    input.value = '';
    
    // Create message object
    const message = {
        id: Date.now().toString(),
        sender: state.currentUser.id,
        senderName: state.currentUser.username,
        avatar: state.currentUser.avatar,
        text: messageText,
        timestamp: Date.now(),
        status: 'sending'
    };
    
    // Add message to UI immediately
    UIManager.addMessage(message, true);
    
    // Send message to NTFY
    NtfyManager.sendMessage(state.activeChat.channel, {
        userId: state.currentUser.id,
        username: state.currentUser.username,
        avatar: state.currentUser.avatar,
        text: messageText,
        timestamp: message.timestamp,
        messageId: message.id
    })
    .then(() => {
        // Update message status to sent
        message.status = 'sent';
        updateMessageInChat(message);
    })
    .catch(error => {
        console.error('Failed to send message:', error);
        message.status = 'failed';
        updateMessageInChat(message);
    });
}

/**
 * Handle a new message received from NTFY
 * @param {Object} data - Message data
 */
/**
 * Send read receipt to indicate message has been read
 * @param {string} channel - NTFY channel
 * @param {string} messageId - ID of the message that was read
 */
function sendReadReceipt(channel, messageId) {
    // Create read receipt message
    const readReceiptMessage = {
        type: 'read_receipt',
        messageId: messageId,
        userId: state.currentUser.id,
        username: state.currentUser.username,
        timestamp: Date.now()
    };
    
    // Send to NTFY
    NtfyManager.sendMessage(channel, readReceiptMessage);
}

/**
 * Send typing indicator to show user is typing
 * @param {string} channel - NTFY channel
 */
function sendTypingIndicator(channel) {
    // Create typing indicator message
    const typingMessage = {
        type: 'typing',
        userId: state.currentUser.id,
        username: state.currentUser.username,
        timestamp: Date.now()
    };
    
    // Send to NTFY
    NtfyManager.sendMessage(channel, typingMessage);
}

function handleNewMessage(data) {
    console.log("handleNewMessage called with data:", data);
    try {
        // Parse the message data
        const messageData = JSON.parse(data.message);
        console.log("Parsed messageData:", messageData);
        
        // Check message type - handle special message types
        if (messageData.type) {
            // Handle read receipt
            if (messageData.type === 'read_receipt') {
                console.log("Received read receipt for message:", messageData.messageId);
                // If we sent the original message, update its status
                if (state.activeChat) {
                    const message = state.activeChat.messages.find(m => m.id === messageData.messageId);
                    if (message && message.sender === state.currentUser.id) {
                        message.status = 'read';
                        updateMessageInChat(message);
                        UIManager.updateMessageStatus(message);
                    }
                }
                return;
            }
            
            // Handle typing indicator
            if (messageData.type === 'typing') {
                console.log("Received typing indicator from:", messageData.username);
                // Show typing indicator if it's not from current user
                if (messageData.userId !== state.currentUser.id) {
                    UIManager.showTypingIndicator(messageData.username);
                    
                    // Auto-hide after 3 seconds
                    setTimeout(() => {
                        UIManager.hideTypingIndicator();
                    }, 3000);
                }
                return;
            }
        }
        
        // Standard message processing continues below
        // Check if this message is from the current user and already displayed
        const isFromSelf = messageData.userId == state.currentUser.id;
        const isAlreadyDisplayed = messageData.messageId && document.getElementById(`message-${messageData.messageId}`);
        
        if (isFromSelf && isAlreadyDisplayed) {
            console.log("Ignoring message from self that's already displayed:", messageData);
            return;
        }
        
        console.log("Processing message. From self:", isFromSelf, "Already displayed:", isAlreadyDisplayed);
        
        // Create message object
        const message = {
            id: messageData.messageId || Date.now().toString(),
            sender: messageData.userId,
            senderName: messageData.username || 'Unknown',
            avatar: messageData.avatar || profilePictures[0],
            text: messageData.text,
            timestamp: messageData.timestamp || Date.now(),
            status: 'received'
        };
        console.log("Created message object:", message);
        
        // If message is not from self, send read receipt
        if (!isFromSelf && state.activeChat) {
            // Delay read receipt to seem more natural
            setTimeout(() => {
                sendReadReceipt(state.activeChat.channel, message.id);
            }, 1000);
        }
        
        // Standardize the topic format to include ntfy.sh/ prefix if it doesn't already have it
        const standardizedTopic = data.topic.includes('ntfy.sh/') ? data.topic : `ntfy.sh/${data.topic}`;
        console.log("Standardized topic:", standardizedTopic);
        
        // Add message to UI
        if (state.activeChat && (state.activeChat.channel === standardizedTopic || 
                                 state.activeChat.channel.endsWith(`/${data.topic}`))) {
            console.log("Adding message to active chat UI");
            UIManager.addMessage(message, false);
        } else {
            console.log("Checking for chat with standardized channel:", standardizedTopic);
            // Increment unread count for non-active chats
            // Try to find the chat by full channel name or just the topic part
            const chat = state.chatList.find(c => 
                c.channel === standardizedTopic || 
                c.channel.endsWith(`/${data.topic}`)
            );
            
            if (chat) {
                console.log("Found existing chat:", chat.name);
                chat.unreadCount = (chat.unreadCount || 0) + 1;
                chat.lastMessage = {
                    text: message.text,
                    timestamp: message.timestamp
                };
                StorageManager.saveChatList(state.chatList);
                UIManager.renderChatList(state.chatList);
            } else {
                console.log("No chat found with channel:", standardizedTopic);
            }
        }
        
        // Fix: If the chat doesn't exist in our list for this topic, create it
        const chatExists = state.chatList.some(c => 
            c.channel === standardizedTopic || 
            c.channel.endsWith(`/${data.topic}`)
        );
        
        if (!chatExists) {
            console.log("Creating new chat for topic:", standardizedTopic);
            // Create a new chat for this channel
            const newChat = {
                id: Date.now().toString(),
                name: `Chat on ${data.topic}`,
                channel: standardizedTopic,
                avatar: "https://cdn-icons-png.flaticon.com/512/17734/17734808.png",
                messages: [],
                lastMessage: null,
                unreadCount: 1
            };
            state.chatList.push(newChat);
            StorageManager.saveChatList(state.chatList);
            UIManager.renderChatList(state.chatList);
        }

        // Store message in chat history using standardized topic
        const chatToUpdate = state.chatList.find(c => 
            c.channel === standardizedTopic || 
            c.channel.endsWith(`/${data.topic}`)
        );
        
        if (chatToUpdate) {
            addMessageToChat(chatToUpdate.channel, message);
        }
        
    } catch (error) {
        console.error('Error processing received message:', error, "Original data:", data);
    }
}

/**
 * Add a message to chat history
 * @param {string} channel - NTFY channel
 * @param {Object} message - Message object
 */
function addMessageToChat(channel, message) {
    const chat = state.chatList.find(c => c.channel === channel);
    if (chat) {
        chat.messages.push(message);
        chat.lastMessage = {
            text: message.text,
            timestamp: message.timestamp
        };
        StorageManager.saveChatList(state.chatList);
    }
}

/**
 * Update a message in chat history
 * @param {Object} message - Message object to update
 */
function updateMessageInChat(message) {
    if (!state.activeChat) return;
    
    const messageIndex = state.activeChat.messages.findIndex(m => m.id === message.id);
    if (messageIndex !== -1) {
        state.activeChat.messages[messageIndex] = message;
        StorageManager.saveChatList(state.chatList);
    } else {
        state.activeChat.messages.push(message);
        state.activeChat.lastMessage = {
            text: message.text,
            timestamp: message.timestamp
        };
        StorageManager.saveChatList(state.chatList);
    }
    
    // Update UI
    UIManager.updateMessageStatus(message);
    UIManager.renderChatList(state.chatList);
}

// The global selectChat function is now defined above.
// This function for selecting by ID is no longer needed.

window.deleteChat = (chatId, event) => {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
        // Unsubscribe if it's the active chat
        if (state.activeChat && state.activeChat.id === chatId) {
            NtfyManager.unsubscribeFromChannel(state.activeChat.channel);
            state.activeChat = null;
            UIManager.hideChat();
        }
        
        // Remove from state and storage
        state.chatList = state.chatList.filter(c => c.id !== chatId);
        StorageManager.saveChatList(state.chatList);
        
        // Update UI
        UIManager.renderChatList(state.chatList);
        
        // Select first chat if available
        if (state.chatList.length > 0 && !state.activeChat) {
            selectChat(state.chatList[0]);
        }
    }
};
