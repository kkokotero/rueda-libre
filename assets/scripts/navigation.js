(() => {
    const navToggle = document.getElementById("nav-toggle");

    if (!navToggle) return;

    const dropdowns = document.querySelectorAll(
        "[data-nav-dropdown]",
    );

    document
        .querySelectorAll(".header--drawer a")
        .forEach((link) => {
            link.addEventListener("click", () => {
                navToggle.checked = false;
                dropdowns.forEach((dropdown) => {
                    dropdown.open = false;
                });
            });
        });

    document
        .querySelectorAll("[data-nav-dropdown] a")
        .forEach((link) => {
            link.addEventListener("click", () => {
                const dropdown = link.closest(
                    "[data-nav-dropdown]",
                );

                if (dropdown) dropdown.open = false;
            });
        });

    document.addEventListener("click", (event) => {
        dropdowns.forEach((dropdown) => {
            if (dropdown.open && !dropdown.contains(event.target)) {
                dropdown.open = false;
            }
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;

        const openDropdown = document.querySelector(
            "[data-nav-dropdown][open]",
        );

        if (openDropdown) {
            openDropdown.open = false;
            openDropdown.querySelector("summary")?.focus();
            return;
        }

        if (navToggle.checked) {
            navToggle.checked = false;
            navToggle.focus();
        }
    });
})();
