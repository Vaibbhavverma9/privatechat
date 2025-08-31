/**
 * Text Formatter
 * Handles WhatsApp-style text formatting for messages
 */

const TextFormatter = (() => {
    /**
     * Format text with WhatsApp-style formatting rules
     * @param {string} text - Raw text to format
     * @returns {string} - HTML formatted text
     */
    function format(text) {
        if (!text) return '';
        
        // Escape HTML characters first
        let formattedText = escapeHtml(text);
        
        // Apply WhatsApp-style formatting
        
        // Code block (three backticks at start and end)
        formattedText = formattedText.replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>');
        
        // Inline code (one backtick at start and end)
        formattedText = formattedText.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        
        // Bold: *text* 
        formattedText = formattedText.replace(/\*((?!\*).+?)\*/g, '<strong>$1</strong>');
        
        // Italic: _text_
        formattedText = formattedText.replace(/_((?!_).+?)_/g, '<em>$1</em>');
        
        // Strikethrough: ~text~
        formattedText = formattedText.replace(/~((?!~).+?)~/g, '<del>$1</del>');
        
        // Convert URLs to clickable links (exclude URLs in code blocks)
        formattedText = formattedText.replace(
            /(?<!<code[^>]*>)(?<!<pre[^>]*>)(https?:\/\/[^\s<]+)(?![^<]*<\/code>)(?![^<]*<\/pre>)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Replace line breaks with <br>
        formattedText = formattedText.replace(/\n/g, '<br>');
        
        return formattedText;
    }

    /**
     * Escape HTML characters to prevent XSS
     * @param {string} html - String to escape
     * @returns {string} - Escaped string
     */
    function escapeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Remove formatting characters for plain text display
     * @param {string} text - Formatted text
     * @returns {string} - Plain text without formatting characters
     */
    function stripFormatting(text) {
        if (!text) return '';
        
        let plainText = text;
        
        // Remove WhatsApp formatting
        
        // Remove code blocks
        plainText = plainText.replace(/```([\s\S]*?)```/g, '$1');
        
        // Remove inline code
        plainText = plainText.replace(/`([^`]+)`/g, '$1');
        
        // Remove bold formatting
        plainText = plainText.replace(/\*((?!\*).+?)\*/g, '$1');
        
        // Remove italic formatting
        plainText = plainText.replace(/_((?!_).+?)_/g, '$1');
        
        // Remove strikethrough formatting
        plainText = plainText.replace(/~((?!~).+?)~/g, '$1');
        
        return plainText;
    }

    // Public API
    return {
        format,
        stripFormatting
    };
})();
