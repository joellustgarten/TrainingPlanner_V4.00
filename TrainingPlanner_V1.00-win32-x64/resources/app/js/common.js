// Language management
import i18next from '../node_modules/i18next/dist/esm/i18next.js';
// import { getUserData } from './db.js';


window.onerror = (message, source, lineno, colno, error) => {
  console.error('Renderer error:', { message, source, lineno, colno, error });
  // Optionally, send this error via IPC to main process or log it using a library like electron-log
  window.showNotification && window.showNotification('An unexpected error occurred. Please try again.');
};

window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  window.showNotification && window.showNotification('An unexpected error occurred. Please try again.');
};

if (window.api?.onAppClosing) {
  window.api.onAppClosing(() => {
    logOut(false); // no reload since app is quitting
  });
}

export async function setLanguage() {
  const savedLanguage = localStorage.getItem('language') || 'en'; // Default to English
  await i18next.init({
    lng: savedLanguage,
    resources: {
      en: { translation: await fetchTranslation('en') },
      es: { translation: await fetchTranslation('es') },
      pt: { translation: await fetchTranslation('pt') }
    }
  });
  updateLanguage(); // Apply the language on the page
}

export function updateLanguage() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    element.textContent = i18next.t(key) || key; // Fallback to key if translation is missing
  });
}

async function fetchTranslation(lang) {
  const response = await fetch(`../i18n/${lang}.json`);
  return response.json();
}

export function setTheme() {
  const savedTheme = localStorage.getItem('theme') || '-light-mode'; // Default to light theme
  const savedContrast = localStorage.getItem('contrast') || '-primary'; // Default contrast
  applyTheme(savedTheme, savedContrast);
}

export function applyTheme(theme, contrast) {
  const wrapper = document.querySelector('.wrapper');
  wrapper.classList.remove('-light-mode', '-dark-mode');
  wrapper.classList.add(theme);
  const backgroundWrapper = document.querySelector('.background-wrapper');
  backgroundWrapper.classList.remove('-primary', '-secondary', '-contrast', '-floating');
  backgroundWrapper.classList.add(contrast);
  const header = document.querySelector('.o-minimal-header');
  header.classList.remove('-primary', '-secondary', '-contrast', '-floating');
  header.classList.add(contrast);
}

export function updateUsernameDisplay() {
  const userDisplay = document.getElementById('username_display');
  const username = localStorage.getItem('userName') || 'Not logged in';
  userDisplay.textContent = username;
}

export function logOut() {
  localStorage.removeItem('userName'); // Clear the userName key
  localStorage.removeItem('role'); // Clear the role key
  updateUsernameDisplay(); // Update the display to reflect logged-out state
  updateNavMenu(); // Update the navMenu to reflect logged-out state
  if (reloading) location.reload(); // Reload the page manually
}

export async function login() {

  console.log('window.api from common.js:', window.api); // Debugging window.api
  console.log('window.api.getUserData from common.js:', window.api?.getUserData); // Debugging window.api.getUserData
  const userCode = document.getElementById('text-input-code').value.trim();
  const errorMessage = document.getElementById('m-dialog__code');
  const loginDialog = document.getElementById('alert-dialog-info-without-close-button');


  if (!userCode) {
    errorMessage.textContent = 'User code cannot be empty';
    errorMessage.style.color = 'var(--major-signal-error__enabled__fill__pressed)';
    return;
  }

  try {
    const userData = await window.api.getUserData(userCode); // changes to expose on context brige from: await getUserData(userCode);
    if (userData) {

      console.log('username is:', userData.username);
      console.log('Role is: ', userData.role);
      // Store user data in localStorage
      localStorage.setItem('userName', userData.username);
      localStorage.setItem('role', userData.role);

      console.log('username localstorage is:', (localStorage.getItem('userName')));
      console.log('Role localstorage is: ', (localStorage.getItem('role')));

      // Update UI
      updateUsernameDisplay();
      updateNavMenu();

      // Close the login dialog
      loginDialog.close();
    } else {
      // Show error message
      errorMessage.textContent = 'Invalid User Code';
    }
  } catch (error) {
    console.error('Error during login:', error);
    errorMessage.textContent = 'An error occurred during login';
  }
}

export function updateNavMenu() {
  // Example: Enable admin-only menu items
  const isAdmin = localStorage.getItem('role') === 'admin';
  if (isAdmin) {
    const links = document.querySelectorAll('.a-menu-item');
    links.forEach(link => {
      if (link.classList.contains('-disabled')) {
        link.classList.remove('-disabled');
        const menuLink = link.querySelector('.a-menu-item__link');
        if (menuLink) {
          menuLink.setAttribute('aria-disabled', 'false');
          menuLink.removeAttribute('tabindex');
        }
      }
    });
  }
}

export function navigationMenu(){
  const menuLinks = document.querySelectorAll('.a-menu-item__link');

  menuLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent default anchor behavior
      const targetPage = link.getAttribute('data-target');

      if (targetPage) {
        if (targetPage === "nonav") {
        } else {
          window.api.navigateTo(targetPage); // Send navigation request to the main process
        }
      } else {
        console.error('Target page not specified for this menu item.');
      }
    });
  });
}

export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Retrieve (or create) the notification container.
export function getNotificationContainer() {
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    // Initially hidden.
    container.style.display = 'none';
    // Optionally, you could add some basic styles here or rely on your CSS file.
    document.body.prepend(container);
  }
  return container;
}

// Display a persistent notification (e.g. a loading message) that remains visible until explicitly hidden.
export function showPersistentNotification(message, type = 'loading') {
  const container = getNotificationContainer();
  container.textContent = message;
  container.className = type;
  container.style.display = 'block';
}

// Hide the persistent notification.
export function hidePersistentNotification() {
  const container = getNotificationContainer();
  container.textContent = '';
  container.className = '';
  container.style.display = 'none';
}

// Display a temporary notification (for success, error, etc.) that auto-hides after a set duration.
export function showNotification(message, type = 'info', duration = 7000) {
  const container = getNotificationContainer();
  container.textContent = message;
  container.className = type;
  container.style.display = 'block';
  setTimeout(() => {
    container.textContent = '';
    container.className = '';
    container.style.display = 'none';
  }, duration);
}

export function createChart(canvasId, chartConfig) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas with id "${canvasId}" not found.`);
    return;
  }
  return new Chart(canvas, chartConfig);
}


// Expose the functions globally
window.setLanguage = setLanguage;
window.updateLanguage = updateLanguage;
window.setTheme = setTheme;
window.updateUsernameDisplay = updateUsernameDisplay;
window.logOut = logOut;
window.logIn = login;
window.navigationMenu = navigationMenu;
window.debounce = debounce;
window.getNotificationContainer = getNotificationContainer;
window.showPersistentNotification = showPersistentNotification;
window.hidePersistentNotification = hidePersistentNotification;
window.showNotification = showNotification;
window.createChart = createChart;

