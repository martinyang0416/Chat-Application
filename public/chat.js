const socket = io();
const full_url = new URLSearchParams(window.location.search);
const username = full_url.get('username');

// send event to server when user joins chatroom
socket.emit('user_join_chatroom', username);

// logout user
function logout() {
    window.location.href = '/';
}

// send one message from user
function send_message_from_user() {
    const message_html = document.getElementById('message-input');
    const message = message_html.value.trim();

    if (message !== '') {
        const current_time = new Date();
        const timestamp = current_time.toISOString();

        const new_message_data = {
            username: username,
            text: message,
            timestamp: timestamp
        };

        socket.emit('send_one_message', new_message_data);
        message_html.value = '';
    }
}

// restore all messages from databse
function restore_all_messages(messages) {
    const chat_container = document.getElementById('chat-container');
    chat_container.innerHTML = ''; 

    messages.forEach((single_message) => {
        append_single_message(single_message);
    });

    chat_container.scrollTop = chat_container.scrollHeight;
}

// append one message to chat container
function append_single_message(single_message) {
    const chat_container = document.getElementById('chat-container');
    const message_div = document.createElement('div');
    message_div.classList.add('chat-message'); 

    const actual_username = (single_message.username === username) ? 'Me' : single_message.username;

    message_div.innerHTML = `
        <div class="message-header">
            <span class="username ${single_message.username === username ? 'me' : ''}">${actual_username}</span>
            <span class="timestamp">${single_message.timestamp}</span>
        </div>
        <div class="message-text">${single_message.text}</div>
    `;

    chat_container.appendChild(message_div);
    chat_container.scrollTop = chat_container.scrollHeight;
}

// send all messages from the server
socket.on('send_all_messages', (messages) => {
    restore_all_messages(messages); 
});

// send one message from the server
socket.on('send_one_message', (single_message) => {
    append_single_message(single_message); 
});
