/**
 * UI Manager
 * Handles all UI-related operations
 */

const UIManager = (() => {
    /**
     * Set the theme for the application
     * @param {string} theme - Theme name ('light' or 'dark')
     */
    function setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        
        // Update theme toggle icon
        const themeToggle = document.getElementById('theme-toggle');
        if (theme === 'dark') {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    /**
     * Render the chat list in the sidebar
     * @param {Array} chatList - Array of chat objects
     */
    function renderChatList(chatList) {
        const chatListElement = document.getElementById('chat-list');
        chatListElement.innerHTML = '';
        
        if (chatList.length === 0) {
            chatListElement.innerHTML = `
                <div class="empty-chat-list">
                    <p>No chats yet. Start a new chat!</p>
                </div>
            `;
            return;
        }
        
        chatList.forEach(chat => {
            const lastMessageTime = chat.lastMessage ? formatTime(new Date(chat.lastMessage.timestamp)) : '';
            const lastMessageText = chat.lastMessage ? chat.lastMessage.text : 'No messages yet';
            
            const chatElement = document.createElement('div');
            chatElement.className = `chat-item ${state.activeChat && state.activeChat.id === chat.id ? 'active' : ''}`;
            chatElement.setAttribute('data-id', chat.id); // Add data-id attribute for mobile view
            // Use a direct reference to the chat object for click handling
            chatElement.addEventListener('click', function() {
                console.log('Chat clicked, calling selectChat directly with the chat object');
                // Directly call the main selectChat function instead of the window function
                selectChat(chat);
            });
            
            chatElement.innerHTML = `
                <div class="avatar">
                    <img src="${chat.avatar}" alt="${chat.name}">
                </div>
                <div class="chat-item-info">
                    <div class="chat-item-header">
                        <div class="chat-item-name">${chat.name}</div>
                        <div class="chat-item-time">${lastMessageTime}</div>
                    </div>
                    <div class="chat-item-message">
                        <div class="chat-item-preview">${formatMessagePreview(lastMessageText)}</div>
                        ${chat.unreadCount ? `<div class="unread-count">${chat.unreadCount}</div>` : ''}
                    </div>
                </div>
                <div class="chat-item-actions">
                    <button class="delete-chat-btn" onclick="deleteChat('${chat.id}', event)" title="Delete Chat">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            chatListElement.appendChild(chatElement);
        });
    }

    /**
     * Display a chat in the main content area
     * @param {Object} chat - Chat object to display
     */
    function displayChat(chat) {
        // Hide welcome screen and show chat container
        document.getElementById('welcome-screen').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
        
        // Set chat header info
        document.getElementById('chat-user-avatar').src = chat.avatar;
        document.getElementById('chat-user-name').textContent = chat.name;
        
        // Display the ntfy URL in the chat user status
        document.getElementById('chat-user-status').textContent = chat.channel;
        
        // Clear messages container
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.innerHTML = '';
        
        // Highlight active chat in list
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Find the chat item by iterating and comparing
        const chatItems = document.querySelectorAll('.chat-item');
        for (let i = 0; i < chatItems.length; i++) {
            const item = chatItems[i];
            // Add 'active' class to the item at the same index as the active chat
            if (i === state.chatList.findIndex(c => c.id === chat.id)) {
                item.classList.add('active');
                break;
            }
        }
        
        // Render messages
        if (chat.messages && chat.messages.length > 0) {
            let currentDate = null;
            
            chat.messages.forEach(message => {
                // Add date separator if needed
                const messageDate = new Date(message.timestamp).toDateString();
                if (messageDate !== currentDate) {
                    currentDate = messageDate;
                    addDateSeparator(messagesContainer, messageDate);
                }
                
                // Add message to UI
                addMessageToUI(messagesContainer, message);
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            // Show empty state
            messagesContainer.innerHTML = `
                <div class="empty-chat">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
        }
    }

    /**
     * Hide the active chat
     */
    function hideChat() {
        document.getElementById('welcome-screen').style.display = 'flex';
        document.getElementById('chat-container').style.display = 'none';
    }

    /**
     * Add a date separator to the messages container
     * @param {HTMLElement} container - Messages container
     * @param {string} dateString - Date string to display
     */
    function addDateSeparator(container, dateString) {
        const dateSeparator = document.createElement('div');
        dateSeparator.className = 'date-separator';
        
        // Format date nicely
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        let formattedDate;
        if (date.toDateString() === today.toDateString()) {
            formattedDate = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            formattedDate = 'Yesterday';
        } else {
            formattedDate = date.toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
        
        dateSeparator.innerHTML = `<span class="date-separator-text">${formattedDate}</span>`;
        container.appendChild(dateSeparator);
    }

    /**
     * Add a message to the UI
     * @param {HTMLElement} container - Messages container
     * @param {Object} message - Message object
     */
    function addMessageToUI(container, message) {
        let messageElement;
        
        try {
            const isSent = message.sender === state.currentUser.id;
            
            messageElement = document.createElement('div');
            messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
            messageElement.id = `message-${message.id}`;
            messageElement.setAttribute('data-timestamp', message.timestamp);
            messageElement.setAttribute('data-message-id', message.id);
            messageElement.setAttribute('data-sender-id', message.sender);
            
            const originalText = message.text || '';
            const formattedText = TextFormatter.format(originalText);
            const mediaContent = extractMediaContent(originalText);
            
            let mediaHtml = '';
            if (mediaContent) {
                mediaHtml = createMediaPreview(mediaContent);
            }
            
            // Check for data URLs to handle them specially
            const isDataUrl = originalText.includes('data:image') || 
                              originalText.includes('data:video') || 
                              originalText.includes('data:application');
                
            // Improved detection for media-only messages 
            const isJustMediaUrl = mediaContent && (
                originalText.trim() === mediaContent.url || 
                (isDataUrl && originalText.includes(mediaContent.url))
            ) && ['image', 'video', 'file'].includes(mediaContent.type);
            
            // Extract just the text portion before the data URL if applicable
            let cleanedText = formattedText;
            if (isDataUrl && mediaContent) {
                // If text contains "Attached file:" extract just that part
                if (originalText.includes('Attached file:')) {
                    const parts = originalText.split('data:');
                    if (parts.length > 0) {
                        // Just get the file name part
                        const filenamePart = parts[0].split('Attached file:')[1].trim();
                        cleanedText = `<strong>Attached:</strong> ${filenamePart}`;
                    }
                } else {
                    cleanedText = ''; // No additional text for pure data URLs
                }
            }
                
            // Improved message bubble layout for better handling of media + text
            messageElement.innerHTML = `
                <div class="message-bubble">
                    ${mediaHtml ? `<div class="media-container">${mediaHtml}</div>` : ''}
                    ${isJustMediaUrl && !cleanedText ? '' : `<div class="message-content formatted-text">${cleanedText || formattedText}</div>`}
                    <div class="message-meta">
                        <span class="message-time">${formatTime(new Date(message.timestamp))}</span>
                        ${isSent ? `
                            <span class="message-status">
                                ${getStatusIcon(message.status)}
                            </span>
                        ` : ''}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering message:', error, message);
            // Create a fallback message element if there's an error
            messageElement = document.createElement('div');
            messageElement.className = `message error`;
            messageElement.id = `message-${message.id || 'unknown'}`;
            messageElement.innerHTML = `
                <div class="message-bubble">
                    <div class="message-content">Error displaying message</div>
                </div>
            `;
        }
        
        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Add a new message to the active chat
     * @param {Object} message - Message object
     * @param {boolean} isSent - Whether the message is sent by the current user
     */
    function addMessage(message, isSent) {
        const messagesContainer = document.getElementById('messages-container');
        
        // Check for existing messages
        const existingMessages = messagesContainer.querySelectorAll('.message');
        
        // Only add date separators when needed (not for every message)
        if (existingMessages.length > 0) {
            // Check if we need to add a date separator
            const messageDate = new Date(message.timestamp).toDateString();
            let needsSeparator = true;
            
            // Get the last message to compare dates
            const lastMessage = messagesContainer.querySelector('.message:last-child');
            if (lastMessage) {
                const lastMessageTime = parseInt(lastMessage.dataset.timestamp);
                const lastMessageDate = new Date(lastMessageTime).toDateString();
                needsSeparator = lastMessageDate !== messageDate;
            }
            
            if (needsSeparator) {
                addDateSeparator(messagesContainer, messageDate);
            }
        } else {
            // First message in chat, add date separator once
            const messageDate = new Date(message.timestamp).toDateString();
            addDateSeparator(messagesContainer, messageDate);
        }
        
        // Add message to UI
        addMessageToUI(messagesContainer, message);
    }

    /**
     * Update the status of a message in the UI
     * @param {Object} message - Message object
     */
    function updateMessageStatus(message) {
        const messageElement = document.getElementById(`message-${message.id}`);
        if (messageElement) {
            const statusElement = messageElement.querySelector('.message-status');
            if (statusElement) {
                statusElement.innerHTML = getStatusIcon(message.status);
            }
        }
    }

    /**
     * Get the icon for a message status
     * @param {string} status - Message status
     * @returns {string} - HTML for status icon
     */
    function getStatusIcon(status) {
        switch (status) {
            case 'sending':
                return '<i class="far fa-clock"></i>';
            case 'sent':
                return '<i class="fas fa-check"></i>';
            case 'delivered':
                return '<i class="fas fa-check-double"></i>';
            case 'read':
                return '<i class="fas fa-check-double" style="color: var(--secondary);"></i>';
            case 'failed':
                return '<i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>';
            default:
                return '';
        }
    }

    /**
     * Extract media content from a message text
     * @param {string} text - Message text
     * @returns {Object|null} - Media content object or null if no media
     */
    function extractMediaContent(text) {
        // Regular expressions for different media types
        const imageRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i;
        const videoRegex = /(https?:\/\/.*\.(?:mp4|webm|ogg))/i;
        const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i;
        const fileRegex = /(https?:\/\/.*\.(?:pdf|doc|docx|xls|xlsx|txt|zip|rar))/i;
        
        // Data URL regex patterns
        const dataImageRegex = /(data:image\/[^;]+;base64,[^\s]+)/i;
        const dataVideoRegex = /(data:video\/[^;]+;base64,[^\s]+)/i;
        const dataFileRegex = /(data:application\/[^;]+;base64,[^\s]+)/i;
        
        let match;
        
        // Check for attached files with filename (from device uploads)
        if (text.includes('Attached file:')) {
            const filename = text.split('Attached file:')[1].split('\n')[0].trim();
            
            // Check for data image
            match = text.match(dataImageRegex);
            if (match) {
                return { 
                    type: 'image', 
                    url: match[1],
                    filename: filename
                };
            }
            
            // Check for data video
            match = text.match(dataVideoRegex);
            if (match) {
                return { 
                    type: 'video', 
                    url: match[1],
                    filename: filename
                };
            }
            
            // Check for data file
            match = text.match(dataFileRegex) || text.match(/(data:[^;]+;base64,[^\s]+)/i);
            if (match) {
                return { 
                    type: 'file', 
                    url: match[1],
                    filename: filename
                };
            }
        }
        
        // Check for regular image data URLs
        match = text.match(dataImageRegex);
        if (match) {
            return { type: 'image', url: match[1] };
        }
        
        // Check for regular video data URLs
        match = text.match(dataVideoRegex);
        if (match) {
            return { type: 'video', url: match[1] };
        }
        
        // Check for images
        match = text.match(imageRegex);
        if (match) {
            return { type: 'image', url: match[1] };
        }
        
        // Check for videos
        match = text.match(videoRegex);
        if (match) {
            return { type: 'video', url: match[1] };
        }
        
        // Check for YouTube
        match = text.match(youtubeRegex);
        if (match) {
            return { 
                type: 'youtube', 
                id: match[1],
                url: `https://www.youtube.com/embed/${match[1]}` 
            };
        }
        
        // Check for files
        match = text.match(fileRegex);
        if (match) {
            const url = match[1];
            const filename = url.split('/').pop();
            return { 
                type: 'file', 
                url: url,
                filename: filename
            };
        }
        
        return null;
    }

    /**
     * Create HTML for a media preview
     * @param {Object} media - Media content object
     * @returns {string} - HTML for media preview
     */
    function createMediaPreview(media) {
        switch (media.type) {
            case 'image':
                return `
                    <div class="media-preview" data-type="image" data-url="${media.url}" onclick="UIManager.showMediaPreview(this)">
                        <img src="${media.url}" alt="${media.filename || 'Image'}" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=Image+Loading+Error';">
                    </div>
                `;
            case 'video':
                return `
                    <div class="media-preview" data-type="video" data-url="${media.url}" onclick="UIManager.showMediaPreview(this)">
                        <video src="${media.url}" controls onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\\'video-error\\'>Video could not be loaded</div>';">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                `;
            case 'youtube':
                return `
                    <div class="media-preview" data-type="youtube" data-url="${media.url}">
                        <div class="youtube-preview">
                            <img src="https://img.youtube.com/vi/${media.id}/0.jpg" alt="YouTube Thumbnail">
                            <div class="youtube-play-button">
                                <i class="fab fa-youtube"></i>
                            </div>
                        </div>
                    </div>
                `;
            case 'file':
                // Determine file icon based on extension
                let fileIcon = 'fas fa-file';
                const extension = media.filename.split('.').pop().toLowerCase();
                
                if (['pdf'].includes(extension)) {
                    fileIcon = 'fas fa-file-pdf';
                } else if (['doc', 'docx'].includes(extension)) {
                    fileIcon = 'fas fa-file-word';
                } else if (['xls', 'xlsx'].includes(extension)) {
                    fileIcon = 'fas fa-file-excel';
                } else if (['zip', 'rar'].includes(extension)) {
                    fileIcon = 'fas fa-file-archive';
                } else if (['txt', 'md'].includes(extension)) {
                    fileIcon = 'fas fa-file-alt';
                }
                
                return `
                    <div class="media-preview" data-type="file" data-url="${media.url}">
                        <div class="file-preview">
                            <i class="${fileIcon}"></i>
                            <div class="file-info">
                                <div class="file-name">${media.filename}</div>
                                <div class="file-action">Click to download</div>
                            </div>
                        </div>
                    </div>
                `;
            default:
                return '';
        }
    }

    /**
     * Show a media preview in a modal
     * @param {HTMLElement} mediaElement - Media element to preview
     */
    function showMediaPreview(mediaElement) {
        const modal = document.getElementById('media-preview-modal');
        const container = document.getElementById('media-preview-container');
        
        const type = mediaElement.dataset.type;
        const url = mediaElement.dataset.url;
        
        // Clear previous content
        container.innerHTML = '';
        
        // Create preview based on media type
        switch (type) {
            case 'image':
                container.innerHTML = `<img src="${url}" alt="Media Preview">`;
                break;
            case 'video':
                container.innerHTML = `
                    <video src="${url}" controls autoplay>
                        Your browser does not support the video tag.
                    </video>
                `;
                break;
            case 'youtube':
                container.innerHTML = `
                    <iframe 
                        width="100%" 
                        height="315" 
                        src="${url}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                `;
                break;
            case 'file':
                // For files, open in a new tab
                window.open(url, '_blank');
                return; // Don't show modal
            default:
                return;
        }
        
        // Show the modal
        showModal('media-preview-modal');
    }

    /**
     * Show a modal
     * @param {string} modalId - ID of the modal to show
     */
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'flex';
    }

    /**
     * Hide a modal
     * @param {string} modalId - ID of the modal to hide
     */
    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'none';
    }

    /**
     * Hide all modals
     */
    function hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    /**
     * Filter the chat list based on a search term
     * @param {string} searchTerm - Term to search for
     */
    function filterChatList(searchTerm) {
        const chatItems = document.querySelectorAll('.chat-item');
        
        chatItems.forEach(item => {
            const chatName = item.querySelector('.chat-item-name').textContent.toLowerCase();
            if (chatName.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * Format a message preview for display in the chat list
     * @param {string} text - Message text
     * @returns {string} - Formatted preview text
     */
    function formatMessagePreview(text) {
        // Remove markdown formatting
        let preview = text.replace(/(\*\*|__)(.*?)\1/g, '$2'); // Bold
        preview = preview.replace(/(\*|_)(.*?)\1/g, '$2'); // Italic
        preview = preview.replace(/~~(.*?)~~/g, '$1'); // Strikethrough
        
        // Remove URLs
        preview = preview.replace(/https?:\/\/\S+/g, '[Media]');
        
        // Truncate if too long
        if (preview.length > 30) {
            preview = preview.substring(0, 27) + '...';
        }
        
        return preview;
    }

    /**
     * Format a timestamp into a readable time
     * @param {Date} date - Date object
     * @returns {string} - Formatted time string
     */
    function formatTime(date) {
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    /**
     * Handle window resize for responsive layout
     */
    function handleResize() {
        const width = window.innerWidth;
        const sidebar = document.querySelector('.sidebar');
        const chatArea = document.querySelector('.chat-area');
        
        if (width <= 768) {
            // Mobile layout
            if (state.activeChat) {
                sidebar.classList.remove('show');
                chatArea.style.display = 'flex';
            } else {
                sidebar.classList.add('show');
                chatArea.style.display = 'none';
            }
            
            // Setup back button functionality in chat header
            const backButton = document.getElementById('back-to-chats');
            if (backButton) {
                // Remove any existing listeners
                const newBackButton = backButton.cloneNode(true);
                backButton.parentNode.replaceChild(newBackButton, backButton);
                
                // Add new click event listener
                newBackButton.addEventListener('click', () => {
                    sidebar.classList.add('show');
                    if (width <= 768) {
                        document.getElementById('welcome-screen').style.display = 'flex';
                        document.getElementById('chat-container').style.display = 'none';
                    }
                });
            }
            
            // Fix mobile chat item clicking
            const chatItems = document.querySelectorAll('.chat-item');
            chatItems.forEach(item => {
                // First remove any existing click handlers to avoid duplicates
                const newItem = item.cloneNode(true);
                if (item.parentNode) {
                    item.parentNode.replaceChild(newItem, item);
                }
                
                // Add click handler for chat items in mobile view
                newItem.addEventListener('click', function(e) {
                    const chatId = this.getAttribute('data-id');
                    if (chatId) {
                        const chat = state.chatList.find(c => c.id === chatId);
                        if (chat) {
                            selectChat(chat);
                            // Show chat area, hide sidebar in mobile view
                            sidebar.classList.remove('show');
                            chatArea.style.display = 'flex';
                        }
                    }
                    e.stopPropagation();
                });
            });
        } else {
            // Desktop layout
            sidebar.classList.remove('show');
            chatArea.style.display = 'flex';
            
            // Remove back button from chat header
            const backButton = document.querySelector('.chat-back-btn');
            if (backButton) {
                backButton.remove();
            }
        }
    }

    // Initialize responsive layout
    window.addEventListener('DOMContentLoaded', handleResize);

    /**
     * Show typing indicator in the chat
     * @param {string} username - Username who is typing
     */
    function showTypingIndicator(username) {
        const messagesContainer = document.getElementById('messages-container');
        
        // Remove any existing typing indicator
        hideTypingIndicator();
        
        // Create typing indicator element
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.id = 'typing-indicator';
        typingIndicator.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
            <div class="typing-text">${username} is typing...</div>
        `;
        
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Hide typing indicator
     */
    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    /**
     * Show message options menu for a message
     * @param {HTMLElement} messageElement - Message element
     */
    function showMessageOptions(messageElement) {
        // Close any existing options menu
        hideAllMessageOptions();
        
        // Get message data
        const messageId = messageElement.getAttribute('data-message-id');
        const senderId = messageElement.getAttribute('data-sender-id');
        const isSent = senderId === state.currentUser.id;
        
        // Create options menu
        const optionsMenu = document.createElement('div');
        optionsMenu.className = 'message-options';
        optionsMenu.id = `options-${messageId}`;
        
        // Add different options depending on whether the message is sent or received
        optionsMenu.innerHTML = `
            <div class="message-option" onclick="UIManager.replyToMessage('${messageId}')">
                <i class="fas fa-reply"></i> Reply
            </div>
            <div class="message-option" onclick="UIManager.showReactionPanel('${messageId}')">
                <i class="far fa-smile"></i> React
            </div>
            ${isSent ? `
                <div class="message-option" onclick="UIManager.deleteMessage('${messageId}')">
                    <i class="far fa-trash-alt"></i> Delete
                </div>
            ` : ''}
        `;
        
        // Add options menu to message
        messageElement.appendChild(optionsMenu);
        
        // Show options menu
        setTimeout(() => {
            optionsMenu.classList.add('show');
        }, 10);
        
        // Close when clicking outside
        document.addEventListener('click', closeMessageOptionsOnClickOutside);
    }
    
    /**
     * Close all message options menus
     */
    function hideAllMessageOptions() {
        const optionsMenus = document.querySelectorAll('.message-options.show');
        optionsMenus.forEach(menu => {
            menu.classList.remove('show');
            setTimeout(() => {
                if (menu.parentNode) {
                    menu.parentNode.removeChild(menu);
                }
            }, 200);
        });
        
        // Remove reaction panels too
        const reactionPanels = document.querySelectorAll('.reaction-panel.show');
        reactionPanels.forEach(panel => {
            panel.classList.remove('show');
            setTimeout(() => {
                if (panel.parentNode) {
                    panel.parentNode.removeChild(panel);
                }
            }, 200);
        });
        
        // Remove click outside listener
        document.removeEventListener('click', closeMessageOptionsOnClickOutside);
    }
    
    /**
     * Close message options when clicked outside
     * @param {Event} event - Click event
     */
    function closeMessageOptionsOnClickOutside(event) {
        const optionsMenus = document.querySelectorAll('.message-options.show, .reaction-panel.show');
        let clickedInside = false;
        
        optionsMenus.forEach(menu => {
            if (menu.contains(event.target)) {
                clickedInside = true;
            }
        });
        
        // Also check if clicked on a message (which might be opening options)
        const messageElements = document.querySelectorAll('.message');
        messageElements.forEach(message => {
            if (message.contains(event.target) && !message.querySelector('.message-options, .reaction-panel')) {
                clickedInside = true;
            }
        });
        
        if (!clickedInside) {
            hideAllMessageOptions();
        }
    }
    
    /**
     * Show reaction panel for a message
     * @param {string} messageId - ID of the message
     */
    function showReactionPanel(messageId) {
        // Hide options menu
        hideAllMessageOptions();
        
        // Find message element
        const messageElement = document.getElementById(`message-${messageId}`);
        if (!messageElement) return;
        
        // Create reaction panel
        const reactionPanel = document.createElement('div');
        reactionPanel.className = 'reaction-panel';
        reactionPanel.id = `reaction-${messageId}`;
        
        // Add common emoji reactions
        reactionPanel.innerHTML = `
            <div class="reaction-emoji" onclick="UIManager.addReaction('${messageId}', '👍')">👍</div>
            <div class="reaction-emoji" onclick="UIManager.addReaction('${messageId}', '❤️')">❤️</div>
            <div class="reaction-emoji" onclick="UIManager.addReaction('${messageId}', '😂')">😂</div>
            <div class="reaction-emoji" onclick="UIManager.addReaction('${messageId}', '😮')">😮</div>
            <div class="reaction-emoji" onclick="UIManager.addReaction('${messageId}', '😢')">😢</div>
            <div class="reaction-emoji" onclick="UIManager.addReaction('${messageId}', '🙏')">🙏</div>
        `;
        
        // Add to message
        messageElement.appendChild(reactionPanel);
        
        // Show panel
        setTimeout(() => {
            reactionPanel.classList.add('show');
        }, 10);
        
        // Close when clicking outside
        document.addEventListener('click', closeMessageOptionsOnClickOutside);
    }
    
    /**
     * Add a reaction to a message
     * @param {string} messageId - ID of the message
     * @param {string} emoji - Emoji reaction
     */
    function addReaction(messageId, emoji) {
        // Find message in active chat
        const message = state.activeChat.messages.find(m => m.id === messageId);
        if (!message) return;
        
        // Initialize reactions if needed
        if (!message.reactions) {
            message.reactions = [];
        }
        
        // Add reaction
        const reaction = {
            emoji: emoji,
            userId: state.currentUser.id,
            username: state.currentUser.username
        };
        
        // Check if user already reacted with this emoji
        const existingReaction = message.reactions.find(r => 
            r.emoji === emoji && r.userId === state.currentUser.id
        );
        
        if (!existingReaction) {
            message.reactions.push(reaction);
            
            // Update storage
            StorageManager.saveChatList(state.chatList);
            
            // Update UI
            updateMessageReactions(messageId);
            
            // TODO: Send reaction to other users via NTFY
        }
        
        // Hide all menus
        hideAllMessageOptions();
    }
    
    /**
     * Update the reactions display for a message
     * @param {string} messageId - ID of the message
     */
    function updateMessageReactions(messageId) {
        // Find message
        const message = state.activeChat.messages.find(m => m.id === messageId);
        if (!message || !message.reactions || message.reactions.length === 0) return;
        
        // Find message element
        const messageElement = document.getElementById(`message-${messageId}`);
        if (!messageElement) return;
        
        // Find or create reactions container
        let reactionsContainer = messageElement.querySelector('.message-reactions');
        if (!reactionsContainer) {
            reactionsContainer = document.createElement('div');
            reactionsContainer.className = 'message-reactions';
            messageElement.querySelector('.message-bubble').appendChild(reactionsContainer);
        } else {
            reactionsContainer.innerHTML = '';
        }
        
        // Group reactions by emoji
        const reactionGroups = {};
        message.reactions.forEach(reaction => {
            if (!reactionGroups[reaction.emoji]) {
                reactionGroups[reaction.emoji] = [];
            }
            reactionGroups[reaction.emoji].push(reaction);
        });
        
        // Add reaction groups to container
        Object.keys(reactionGroups).forEach(emoji => {
            const group = reactionGroups[emoji];
            const reactionElement = document.createElement('div');
            reactionElement.className = 'message-reaction';
            reactionElement.innerHTML = `
                <span class="message-reaction-emoji">${emoji}</span>
                <span class="message-reaction-count">${group.length}</span>
            `;
            
            // Add tooltip with usernames
            const usernames = group.map(r => r.username).join(', ');
            reactionElement.title = usernames;
            
            reactionsContainer.appendChild(reactionElement);
        });
    }
    
    /**
     * Reply to a message
     * @param {string} messageId - ID of the message to reply to
     */
    function replyToMessage(messageId) {
        // Find message
        const message = state.activeChat.messages.find(m => m.id === messageId);
        if (!message) return;
        
        // TODO: Implement reply UI and functionality
        console.log("Reply to message:", message);
        
        // For now, just add a placeholder text to input
        const inputElement = document.getElementById('message-input');
        inputElement.value = `Replying to "${message.text.substring(0, 20)}...": `;
        inputElement.focus();
        
        // Hide options menu
        hideAllMessageOptions();
    }
    
    /**
     * Delete a message
     * @param {string} messageId - ID of the message to delete
     */
    function deleteMessage(messageId) {
        // Confirm deletion
        if (confirm('Are you sure you want to delete this message?')) {
            // Find message
            const messageIndex = state.activeChat.messages.findIndex(m => m.id === messageId);
            if (messageIndex === -1) return;
            
            // Remove from array
            state.activeChat.messages.splice(messageIndex, 1);
            
            // Update storage
            StorageManager.saveChatList(state.chatList);
            
            // Remove from UI
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement) {
                messageElement.remove();
            }
            
            // TODO: Notify other users of deletion via NTFY
        }
        
        // Hide options menu
        hideAllMessageOptions();
    }

    // Public API
    return {
        setTheme,
        renderChatList,
        displayChat,
        hideChat,
        addMessage,
        updateMessageStatus,
        showMediaPreview,
        showModal,
        hideModal,
        hideAllModals,
        filterChatList,
        handleResize,
        showTypingIndicator,
        hideTypingIndicator,
        showMessageOptions,
        hideAllMessageOptions,
        showReactionPanel,
        addReaction,
        updateMessageReactions,
        replyToMessage,
        deleteMessage
    };
})();
