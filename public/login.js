document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
        .then(response => response.json())
        .then(data => {
            // go to chat page
            if (data.success) {
                window.location.href = '/chat?username=' + username;
            }
            else {
                alert(data.error);
            }
        })
        .catch(error => console.error('Login Page has an Error'));
});
