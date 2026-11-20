
/* ==================================================
   Mottainai Connect - Dashboard Controller
   Sidebar and Navigation
================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const sidebar = document.getElementById("dashboard-sidebar");
    const toggleButton = document.getElementById("sidebar-toggle");

    const navigationLinks = document.querySelectorAll(".sidebar-link");

    // Mobile Sidebar Toggle
    if (sidebar && toggleButton) {

        toggleButton.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });

    }

    // Sidebar Navigation
    navigationLinks.forEach(link => {

        link.addEventListener("click", () => {

            // Remove active class from all links
            navigationLinks.forEach(item => {
                item.classList.remove("active");
            });

            // Activate clicked link
            link.classList.add("active");

            // Close sidebar on mobile
            if (sidebar) {
                sidebar.classList.remove("open");
            }

        });

    });

    // Update active menu when URL hash changes
    function updateActiveLink() {

        const currentHash = window.location.hash || "#overview";

        navigationLinks.forEach(link => {

            link.classList.toggle(
                "active",
                link.getAttribute("href") === currentHash
            );

        });

    }

    window.addEventListener("hashchange", updateActiveLink);

    updateActiveLink();

    console.log("Mottainai Dashboard Initialized!");

});
