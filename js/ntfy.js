/**
 * NTFY Manager
 * Handles communication with the NTFY service for real-time messaging
 */

const NtfyManager = (() => {
    // Active EventSource connections
    const activeSubscriptions = {};

    /**
     * Subscribe to a NTFY channel to receive messages
     * @param {string} channel - Channel to subscribe to
     * @param {Function} callback - Function to call when messages are received
     */
    function subscribeToChannel(channel, callback) {
        console.log(`Attempting to subscribe to NTFY channel: ${channel}`);
        
        // Unsubscribe if already subscribed
        if (activeSubscriptions[channel]) {
            console.log(`Already subscribed to ${channel}, unsubscribing first`);
            unsubscribeFromChannel(channel);
        }
        
        try {
            // Create new EventSource connection with correct URL format
            // Strip 'ntfy.sh/' prefix if present for proper URL construction
            let baseChannel = channel;
            if (channel.startsWith('ntfy.sh/')) {
                baseChannel = channel.replace('ntfy.sh/', '');
            }
            
            // Construct proper EventSource URL with cache busting
            const cacheBuster = new Date().getTime();
            const sourceUrl = `https://ntfy.sh/${baseChannel}/sse?_=${cacheBuster}`;
            console.log(`Connecting to EventSource URL: ${sourceUrl}`);
            
            // Create EventSource with cache control options
            const source = new EventSource(sourceUrl);
            
            // Setup event handlers
            source.addEventListener('open', () => {
                console.log(`EventSource connection opened successfully to ${sourceUrl}`);
            });
            
            source.addEventListener('message', event => {
                try {
                    console.log("Received raw NTFY event:", event.data);
                    const data = JSON.parse(event.data);
                    console.log("Parsed NTFY message data:", data);
                    
                    // Fix the topic field if needed
                    if (!data.topic && baseChannel) {
                        data.topic = baseChannel;
                    }
                    
                    callback(data);
                } catch (error) {
                    console.error('Error parsing NTFY message:', error);
                }
            });
            
            source.addEventListener('error', error => {
                console.error('NTFY connection error:', error);
                // Try to reconnect after a delay
                setTimeout(() => {
                    if (activeSubscriptions[channel] === source) {
                        console.log(`Attempting to reconnect to ${channel} after error`);
                        unsubscribeFromChannel(channel);
                        subscribeToChannel(channel, callback);
                    }
                }, 5000);
            });
            
            // Store the connection
            activeSubscriptions[channel] = source;
            console.log(`Successfully subscribed to NTFY channel: ${channel}`);
            
        } catch (error) {
            console.error('Failed to subscribe to NTFY channel:', error);
        }
    }

    /**
     * Unsubscribe from a NTFY channel
     * @param {string} channel - Channel to unsubscribe from
     */
    function unsubscribeFromChannel(channel) {
        const source = activeSubscriptions[channel];
        if (source) {
            source.close();
            delete activeSubscriptions[channel];
            console.log(`Unsubscribed from NTFY channel: ${channel}`);
        }
    }

    /**
     * Send a message to a NTFY channel
     * @param {string} channel - Channel to send the message to
     * @param {Object} message - Message object to send
     * @returns {Promise} - Promise that resolves when the message is sent
     */
    function sendMessage(channel, message) {
        // Process channel name to ensure proper URL format
        let baseChannel = channel;
        if (channel.startsWith('ntfy.sh/')) {
            baseChannel = channel.replace('ntfy.sh/', '');
        }
        
        // Add a cache-busting timestamp to prevent caching issues
        // This ensures every message is treated as unique by the browser and CDNs
        const cacheBuster = new Date().getTime();
        const postUrl = `https://ntfy.sh/${baseChannel}?_=${cacheBuster}`;
        console.log(`Sending message to: ${postUrl}`, message);
        
        return new Promise((resolve, reject) => {
            fetch(postUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                body: JSON.stringify(message)
            })
            .then(response => {
                if (response.ok) {
                    console.log(`Message sent successfully to ${baseChannel}`);
                    resolve();
                } else {
                    console.error(`Failed to send message: ${response.status} ${response.statusText}`);
                    reject(new Error(`Failed to send message: ${response.status} ${response.statusText}`));
                }
            })
            .catch(error => {
                console.error(`Error sending message to ${baseChannel}:`, error);
                reject(error);
            });
        });
    }

    /**
     * Close all active subscriptions
     */
    function closeAllConnections() {
        Object.keys(activeSubscriptions).forEach(channel => {
            unsubscribeFromChannel(channel);
        });
    }

    // Clean up connections when the window is closed
    window.addEventListener('beforeunload', closeAllConnections);

    // Public API
    return {
        subscribeToChannel,
        unsubscribeFromChannel,
        sendMessage,
        closeAllConnections
    };
})();
