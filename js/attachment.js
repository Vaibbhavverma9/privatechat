/**
 * Attachment Manager
 * Handles attachment selection and insertion
 */

const AttachmentManager = (() => {
    // File upload types
    const fileTypes = {
        'image-upload': 'image/*',
        'video-upload': 'video/*',
        'document-upload': '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar',
        'audio-upload': 'audio/*'
    };
    
    /**
     * Determine the type of content from a URL
     * @param {string} url - The URL to check
     * @returns {string} - The content type (image, video, document, etc.)
     */
    function determineUrlType(url) {
        if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
            return 'image';
        } else if (url.match(/\.(mp4|webm|ogg|mov)$/i)) {
            return 'video';
        } else if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) {
            return 'audio';
        } else if (url.match(/\.(pdf|doc|docx|xls|xlsx|txt|zip|rar)$/i)) {
            return 'document';
        } else if (url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)/i)) {
            return 'youtube';
        } else {
            return 'url';
        }
    }
    
    /**
     * Initialize attachment functionality
     */
    function initAttachmentOptions() {
        // Create a new attachment options menu based on the design
        const attachmentOptionsElement = document.getElementById('attachment-options');
        attachmentOptionsElement.innerHTML = `
            <div class="attachment-url-container">
                <input type="text" class="attachment-url-input" placeholder="enter your url here" id="attachment-url">
                <button class="attachment-send-btn" id="attachment-url-send">Send</button>
            </div>
            <div class="attachment-options-grid">
                <button class="attachment-option" id="attach-photo">Photo</button>
                <button class="attachment-option" id="attach-video">Video</button>
                <button class="attachment-option" id="attach-document">Document</button>
                <button class="attachment-option" id="attach-audio">Audio</button>
            </div>
        `;

        // Toggle attachment options menu
        document.getElementById('attach-btn').addEventListener('click', (event) => {
            const attachmentOptions = document.getElementById('attachment-options');
            attachmentOptions.classList.toggle('show');
            
            // Position the attachment options directly above the attachment button
            const attachBtn = document.getElementById('attach-btn');
            const rect = attachBtn.getBoundingClientRect();
            
            // Center the popup horizontally
            const popupWidth = 350; // width from CSS
            const centerPosition = rect.left - (popupWidth / 2) + (rect.width / 2);
            const leftPosition = Math.max(10, Math.min(centerPosition, window.innerWidth - popupWidth - 10));
            
            // Position above the button with a slight offset
            attachmentOptions.style.bottom = `${window.innerHeight - rect.top + 10}px`;
            attachmentOptions.style.left = `${leftPosition}px`;
            
            // Prevent the default action
            event.preventDefault();
            event.stopPropagation();
        });

        // Close attachment options when clicking outside
        document.addEventListener('click', (event) => {
            const attachmentOptions = document.getElementById('attachment-options');
            const attachBtn = document.getElementById('attach-btn');
            
            if (attachmentOptions.classList.contains('show') && 
                !attachmentOptions.contains(event.target) && 
                !attachBtn.contains(event.target)) {
                attachmentOptions.classList.remove('show');
            }
        });

        // URL input and send button
        document.getElementById('attachment-url-send').addEventListener('click', () => {
            const url = document.getElementById('attachment-url').value.trim();
            if (url) {
                // Determine type based on URL
                const type = determineUrlType(url);
                insertAttachment(type, url);
                document.getElementById('attachment-options').classList.remove('show');
                document.getElementById('attachment-url').value = '';
            }
        });
        
        document.getElementById('attachment-url').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const url = e.target.value.trim();
                if (url) {
                    const type = determineUrlType(url);
                    insertAttachment(type, url);
                    document.getElementById('attachment-options').classList.remove('show');
                    e.target.value = '';
                }
            }
        });

        // Add event listeners for file upload options
        document.getElementById('attach-photo').addEventListener('click', () => {
            handleFileUpload('image-upload');
        });
        
        document.getElementById('attach-video').addEventListener('click', () => {
            handleFileUpload('video-upload');
        });
        
        document.getElementById('attach-document').addEventListener('click', () => {
            handleFileUpload('document-upload');
        });
        
        document.getElementById('attach-audio').addEventListener('click', () => {
            handleFileUpload('audio-upload');
        });
        
        // Set up the file upload element
        const fileUpload = document.getElementById('file-upload');
        fileUpload.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleSelectedFile(e.target.files[0]);
            }
        });
    }
    
    /**
     * Handle file upload from device
     * @param {string} type - Upload file type (image, video, document)
     */
    function handleFileUpload(type) {
        const fileUpload = document.getElementById('file-upload');
        
        // Set accepted file types
        fileUpload.accept = fileTypes[type] || '';
        
        // Clear any previous file
        fileUpload.value = '';
        
        // Trigger file selection
        fileUpload.click();
        
        // Hide attachment options
        document.getElementById('attachment-options').classList.remove('show');
    }
    
    /**
     * Handle a selected file from the file input
     * @param {File} file - The file object from the input
     */
    function handleSelectedFile(file) {
        // Check file size - NTFY has a 2MB limit
        const MAX_SIZE = 2 * 1024 * 1024; // 2MB in bytes
        
        if (file.size > MAX_SIZE) {
            // Show warning toast about file size
            alert("File is too large! NTFY has a 2MB size limit. Please select a smaller file.");
            return;
        }
        
        // Create a loading indicator in the message input
        const messageInput = document.getElementById('message-input');
        messageInput.value = `Uploading ${file.name}...`;
        messageInput.disabled = true;
        
        // Create a FileReader to read the file as data URL
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            
            // Determine file type category
            let fileType = 'document';
            if (file.type.startsWith('image/')) {
                fileType = 'image';
            } else if (file.type.startsWith('video/')) {
                fileType = 'video';
            }
            
            // Insert the data URL as an attachment
            insertAttachment(fileType, dataUrl, file.name);
            
            // Enable the message input
            messageInput.disabled = false;
        };
        
        reader.onerror = () => {
            alert('Error reading file. Please try again.');
            messageInput.value = '';
            messageInput.disabled = false;
        };
        
        // Read the file as a data URL
        reader.readAsDataURL(file);
    }

    /**
     * Prompt user for attachment URL
     * @param {string} type - Attachment type
     * @param {string} promptText - Text to display in prompt
     */
    function promptForAttachment(type, promptText) {
        // Create a modern popup for attachment
        const popup = document.createElement('div');
        popup.className = 'attachment-popup';
        popup.innerHTML = `
            <div class="attachment-popup-content">
                <div class="attachment-popup-header">
                    <h3>${promptText}</h3>
                    <button class="attachment-popup-close">&times;</button>
                </div>
                <div class="attachment-popup-body">
                    <input type="text" class="attachment-url-input" placeholder="Enter URL here..." />
                    <div class="attachment-popup-preview" id="attachment-preview"></div>
                </div>
                <div class="attachment-popup-footer">
                    <button class="attachment-cancel-btn">Cancel</button>
                    <button class="attachment-send-btn">Send</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Focus input
        const input = popup.querySelector('.attachment-url-input');
        input.focus();
        
        // Preview for image type
        if (type === 'image') {
            input.addEventListener('input', () => {
                const url = input.value.trim();
                const preview = document.getElementById('attachment-preview');
                if (url && url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
                    preview.innerHTML = `<img src="${url}" alt="Preview" />`;
                } else {
                    preview.innerHTML = '';
                }
            });
        }
        
        // Close button handler
        popup.querySelector('.attachment-popup-close').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
        
        // Cancel button handler
        popup.querySelector('.attachment-cancel-btn').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
        
        // Send button handler
        popup.querySelector('.attachment-send-btn').addEventListener('click', () => {
            const url = input.value.trim();
            if (url) {
                insertAttachment(type, url);
                document.body.removeChild(popup);
            }
        });
        
        // Enter key handler
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const url = input.value.trim();
                if (url) {
                    insertAttachment(type, url);
                    document.body.removeChild(popup);
                }
            }
        });
        
        // Hide attachment options
        document.getElementById('attachment-options').classList.remove('show');
    }

    /**
     * Insert attachment URL into message input
     * @param {string} type - Attachment type
     * @param {string} url - Attachment URL
     * @param {string} [filename] - Optional filename for uploaded files
     */
    function insertAttachment(type, url, filename) {
        const messageInput = document.getElementById('message-input');
        
        try {
            // Check if there's already text in the input
            const existingText = messageInput.value.trim();
            
            // If this is a data URL and has a filename, add some context
            if (url.startsWith('data:') && filename) {
                // If there's existing text, add the attachment after it
                if (existingText) {
                    messageInput.value = `${existingText}\n\nAttached file: ${filename}\n${url}`;
                } else {
                    messageInput.value = `Attached file: ${filename}\n${url}`;
                }
            } else {
                // If there's existing text, add the URL after it
                if (existingText) {
                    messageInput.value = `${existingText}\n\n${url}`;
                } else {
                    // Insert the URL directly - our message parser will recognize and display it
                    messageInput.value = url;
                }
            }
            
            // Focus the input and move cursor to end
            messageInput.focus();
            messageInput.selectionStart = messageInput.selectionEnd = messageInput.value.length;
            
            // Enable send button after attachment is added
            const sendButton = document.getElementById('send-btn');
            if (sendButton) {
                sendButton.disabled = false;
            }
        } catch (error) {
            console.error('Error inserting attachment:', error);
            // Recover gracefully
            messageInput.value = url || 'Error attaching file';
            messageInput.disabled = false;
        }
    }

    return {
        initAttachmentOptions
    };
})();