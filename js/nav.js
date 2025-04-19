document.addEventListener('DOMContentLoaded', () => {
  const menuLinks = document.querySelectorAll('.a-menu-item__link');

  menuLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent default anchor behavior
      const targetPage = link.getAttribute('data-target');

      if (targetPage) {
        if (targetPage === "none") {
          return;
        } else {
          window.electronAPI.navigateTo(targetPage); // Send navigation request to the main process
        }
      } else {
        console.error('Target page not specified for this menu item.');
      }
    });
  });
});