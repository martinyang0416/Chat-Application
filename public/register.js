document.getElementById('registerForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const username = event.target.username.value;
    const password = event.target.password.value;

    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
        .then(response => response.json())
        .then(data => {
            // back to login page
            if (data.success) {
                window.location.href = '/';
            }
            else {
                alert(data.error);
            }
        })
        .catch(error => console.error('Registerration Page has an Error'));
});
