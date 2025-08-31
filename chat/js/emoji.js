/**
 * Emoji Manager
 * Handles emoji selection and display
 */

const EmojiManager = (() => {
    // Common emoji categories and their emojis
    const emojiCategories = {
        smileys: [
            '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
            '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
            '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
            '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
            '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯'
        ],
        animals: [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
            '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🦆',
            '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦅', '🦉', '🦇', '🐺',
            '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟'
        ],
        food: [
            '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒',
            '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬',
            '🌽', '🥕', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀', '🍕',
            '🌮', '🌯', '🥪', '🍗', '🍖', '🥩', '🍤', '🍝', '🍜', '🍲'
        ],
        activities: [
            '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
            '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣',
            '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️'
        ],
        travel: [
            '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
            '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🚨', '🚔', '🚍',
            '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄'
        ],
        objects: [
            '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️',
            '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️',
            '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭'
        ],
        symbols: [
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
            '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
            '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐'
        ],
        flags: [
            '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏴‍☠️', '🇦🇨', '🇦🇩', '🇦🇪',
            '🇦🇫', '🇦🇬', '🇦🇮', '🇦🇱', '🇦🇲', '🇦🇴', '🇦🇶', '🇦🇷', '🇦🇸', '🇦🇹'
        ],
    };

    // Current active category
    let activeCategory = 'smileys';

    /**
     * Initialize the emoji picker
     */
    function initEmojiPicker() {
        const emojiContainer = document.querySelector('.emoji-container');
        loadEmojiCategory(activeCategory);

        // Add category change event listeners
        document.querySelectorAll('.emoji-categories button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.emoji-categories button').forEach(b => {
                    b.classList.remove('active');
                });
                button.classList.add('active');
                activeCategory = button.dataset.category;
                loadEmojiCategory(activeCategory);
            });
        });

        // Add emoji search functionality
        const searchInput = document.getElementById('emoji-search');
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            if (searchTerm) {
                searchEmojis(searchTerm);
            } else {
                loadEmojiCategory(activeCategory);
            }
        });

        // Toggle emoji picker
        document.getElementById('emoji-btn').addEventListener('click', (event) => {
            const emojiPicker = document.getElementById('emoji-picker');
            emojiPicker.classList.toggle('show');
            
            // Position the emoji picker directly above the emoji button
            const emojiBtn = document.getElementById('emoji-btn');
            const rect = emojiBtn.getBoundingClientRect();
            const emojiPickerHeight = emojiPicker.offsetHeight;
            
            // Position above the button with a slight offset
            emojiPicker.style.bottom = `${window.innerHeight - rect.top + 10}px`;
            emojiPicker.style.left = `${rect.left}px`;
            
            // Prevent the default action
            event.preventDefault();
            event.stopPropagation();
        });

        // Close emoji picker when clicking outside
        document.addEventListener('click', (event) => {
            const emojiPicker = document.getElementById('emoji-picker');
            const emojiBtn = document.getElementById('emoji-btn');
            
            if (emojiPicker.classList.contains('show') && 
                !emojiPicker.contains(event.target) && 
                !emojiBtn.contains(event.target)) {
                emojiPicker.classList.remove('show');
            }
        });
    }

    /**
     * Load emojis for a specific category
     * @param {string} category - Category name
     */
    function loadEmojiCategory(category) {
        const emojis = emojiCategories[category] || [];
        const emojiContainer = document.querySelector('.emoji-container');
        emojiContainer.innerHTML = '';

        emojis.forEach(emoji => {
            const emojiElement = document.createElement('div');
            emojiElement.className = 'emoji-item';
            emojiElement.textContent = emoji;
            emojiElement.addEventListener('click', () => {
                insertEmoji(emoji);
            });
            emojiContainer.appendChild(emojiElement);
        });
    }

    /**
     * Search emojis across all categories
     * @param {string} searchTerm - Term to search for
     */
    function searchEmojis(searchTerm) {
        const emojiContainer = document.querySelector('.emoji-container');
        emojiContainer.innerHTML = '';

        for (const category in emojiCategories) {
            emojiCategories[category].forEach(emoji => {
                // Simple search - could be improved with emoji descriptions
                if (emoji.includes(searchTerm)) {
                    const emojiElement = document.createElement('div');
                    emojiElement.className = 'emoji-item';
                    emojiElement.textContent = emoji;
                    emojiElement.addEventListener('click', () => {
                        insertEmoji(emoji);
                    });
                    emojiContainer.appendChild(emojiElement);
                }
            });
        }
    }

    /**
     * Insert emoji into message input
     * @param {string} emoji - Emoji to insert
     */
    function insertEmoji(emoji) {
        const messageInput = document.getElementById('message-input');
        const cursorPos = messageInput.selectionStart;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(cursorPos);
        
        messageInput.value = textBefore + emoji + textAfter;
        
        // Set the cursor position after the inserted emoji
        messageInput.selectionStart = cursorPos + emoji.length;
        messageInput.selectionEnd = cursorPos + emoji.length;
        
        // Focus the input
        messageInput.focus();
        
        // Hide the emoji picker
        document.getElementById('emoji-picker').classList.remove('show');
    }

    return {
        initEmojiPicker,
        insertEmoji
    };
})();