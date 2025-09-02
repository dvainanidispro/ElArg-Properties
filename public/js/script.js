[...document.querySelectorAll(".sidebar .sidebar-link")].forEach(link => {
    if (link.getAttribute("href") === window.location.pathname) {
        link.classList.add("active");
    }
});