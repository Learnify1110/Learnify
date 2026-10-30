/* =========================
   MOBILE MENU
========================= */

function toggleMenu() {

    const nav = document.getElementById("navMenu");

    nav.classList.toggle("active");

}


/* =========================
   LOGIN
========================= */

function openLogin() {

    document
        .getElementById("loginModal")
        .classList.add("active");

}


/* =========================
   REGISTER
========================= */

function openRegister() {

    document
        .getElementById("registerModal")
        .classList.add("active");

}


/* =========================
   CLOSE MODAL
========================= */

function closeModal(id) {

    document
        .getElementById(id)
        .classList.remove("active");

}

/* =========================
   LOGIN FUNCTION
========================= */

async function login() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    if (!email.includes("@")) {
        alert("Please enter a valid email.");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Login failed. Please check your credentials.");
            return;
        }

        // Save login information
        if (data.token) {
            localStorage.setItem("learnifyToken", data.token);
        }

        if (data.user) {
            localStorage.setItem("learnifyUser", JSON.stringify(data.user));
            localStorage.setItem("learnifyUserName", data.user.name || "");
        }

        alert("Login successful! 🚀");
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Login error:", error);
        alert("Unable to connect to the backend. Please check whether the server is running.");
    }
}


/* =========================
   REGISTER FUNCTION
========================= */

async function register() {
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!name || !email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("Please enter a valid email address.");
        return;
    }

    if (password.length < 8) {
        alert("Password must be at least 8 characters long.");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Registration failed.");
            return;
        }

        localStorage.setItem("learnifyUser", JSON.stringify(data.user));
        localStorage.setItem("learnifyUserName", data.user.name);

        alert(`Welcome to Learnify, ${data.user.name}! 🎓`);

        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Registration error:", error);
        alert("Cannot connect to the backend. Please check the server.");
    }
}



/* =========================
   DEMO BUTTON
========================= */

function showMessage() {

    alert(
        "Demo video will be available soon! 🎬"
    );

}


/* =========================
   CLOSE MODAL WHEN CLICKING
   OUTSIDE THE BOX
========================= */

window.addEventListener("click", function(event) {

    const loginModal =
        document.getElementById("loginModal");

    const registerModal =
        document.getElementById("registerModal");


    if (event.target === loginModal) {

        closeModal("loginModal");

    }


    if (event.target === registerModal) {

        closeModal("registerModal");

    }

});
