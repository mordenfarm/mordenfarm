
// --- MAIN APPLICATION SCRIPT ---
// This script initializes Firebase, seeds the database if necessary,
// and manages the primary user interface and application logic.

import { seedDatabase } from './db-seed.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & DATA ---
    let currentUser = null;
    let isSubscribed = false;
    let currentAuthMode = 'signin';
    let allCourses = []; // This will be populated from Firestore

    // --- FIREBASE INITIALIZATION ---
    if (typeof firebaseConfig === 'undefined' || typeof firebase === 'undefined') {
        console.error("Firebase config or SDK is not defined. App cannot start.");
        return;
    }

    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully.");
        initializeAppLogic(); // Start the main app logic
    } catch (error) {
        // This can happen on hot reloads. Check if it's already initialized.
        if (error.code === 'app/duplicate-app') {
            console.log("Firebase already initialized.");
            initializeAppLogic();
        } else {
            console.error("Firebase initialization failed:", error);
        }
    }

    // --- DOM ELEMENTS ---
    const elements = {
        views: document.querySelectorAll('.view-section'),
        courseGrid: document.querySelector('.course-grid'),
        coursePagesContainer: document.getElementById('course-pages-container'),
        searchInput: document.getElementById('searchInput'),
        searchResults: document.getElementById('searchResults'),
        searchIconMobile: document.getElementById('searchIconMobile'),
        headerCenter: document.getElementById('headerCenter'),
        searchBackdrop: document.getElementById('searchBackdrop'),
        hamburgerCheckbox: document.getElementById('hamburger-checkbox'),
        mobileNav: document.getElementById('mobileNav'),
        mobileNavBackdrop: document.getElementById('mobileNavBackdrop'),
        mobileCoursesToggle: document.getElementById('mobileCoursesToggle'),
        mobileCoursesDropdown: document.getElementById('mobileNav').querySelector('.dropdown-content'),
        desktopCoursesDropdown: document.querySelector('.desktop-nav .dropdown-content'),
        footerCourseLinks: document.getElementById('footer-course-links'),
        authModal: document.getElementById('authModal'),
        authForm: document.getElementById('authForm'),
        userProfile: document.getElementById('userProfile'),
        userAvatar: document.getElementById('userAvatar'),
        userName: document.getElementById('userName'),
        userActionText: document.getElementById('userActionText'),
        closeAuthModal: document.getElementById('closeAuthModal'),
        authTitle: document.getElementById('authTitle'),
        authSubtitle: document.getElementById('authSubtitle'),
        authSubmitBtn: document.getElementById('authSubmitBtn'),
        authSwitchLink: document.getElementById('authSwitchLink'),
        googleSignInBtn: document.getElementById('googleSignInBtn'),
        usernameGroup: document.getElementById('usernameGroup'),
        authSwitchText: document.getElementById('authSwitchText'),
    };

    // --- INITIALIZATION ---
    async function initializeAppLogic() {
        const db = firebase.firestore();

        // 1. Seed the database if necessary
        await seedDatabase(db);

        // 2. Fetch course data from Firestore
        await fetchCourses(db);

        // 3. Set up event listeners
        initializeEventListeners();

        // 4. Check the user's authentication state
        firebase.auth().onAuthStateChanged(handleAuthStateChange);

        // 5. Set the initial state of the authentication modal
        switchAuthMode(currentAuthMode, true);
    }

    // --- DATA FETCHING ---
    async function fetchCourses(db) {
        try {
            const coursesCollection = db.collection("courses");
            const snapshot = await coursesCollection.get();
            allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            populateCourseContent();
        } catch (error) {
            console.error("Error fetching courses:", error);
            elements.courseGrid.innerHTML = `<p style="color: var(--text-secondary);">Could not load courses. Please check the console for errors.</p>`;
        }
    }

    // --- DYNAMIC CONTENT POPULATION ---
    function populateCourseContent() {
        if (!allCourses.length) return;
        elements.courseGrid.innerHTML = allCourses.map(course => `
            <a href="${course.id}.html" class="course-card">
                <div class="card-thumbnail" style="background-image: url('${course.image}');"></div>
                <div class="card-info">
                    <h3><span>${course.title}</span></h3>
                    <p>${course.subtitle}</p>
                </div>
            </a>`).join('');

        const dropdownHTML = allCourses.map(course => `<a href="${course.id}.html" class="nav-link">${course.title}</a>`).join('');
        elements.desktopCoursesDropdown.innerHTML = dropdownHTML;
        elements.mobileCoursesDropdown.innerHTML = dropdownHTML;

        elements.footerCourseLinks.innerHTML = allCourses.map(c => `<li><a href="${c.id}.html" class="nav-link">${c.title}</a></li>`).join('');
    }

    // --- EVENT LISTENERS & NAVIGATION ---
    function initializeEventListeners() {
        elements.userProfile.addEventListener('click', () => currentUser ? handleLogout() : openAuthModal());
        elements.closeAuthModal.addEventListener('click', closeAuthModal);
        elements.authModal.addEventListener('click', e => { if (e.target === elements.authModal) closeAuthModal(); });
        elements.authForm.addEventListener('submit', handleAuthSubmit);
        elements.googleSignInBtn.addEventListener('click', handleGoogleSignIn);
        elements.authSwitchLink.addEventListener('click', e => { e.preventDefault(); switchAuthMode(currentAuthMode === 'signin' ? 'signup' : 'signin'); });
        elements.hamburgerCheckbox.addEventListener('change', toggleMobileMenu);
        elements.mobileNavBackdrop.addEventListener('click', () => { elements.hamburgerCheckbox.checked = false; toggleMobileMenu(); });
        elements.mobileCoursesToggle.addEventListener('click', e => { e.preventDefault(); elements.mobileCoursesDropdown.classList.toggle('show'); });
        elements.searchIconMobile.addEventListener('click', toggleMobileSearch);
        elements.searchBackdrop.addEventListener('click', closeSearch);
        elements.searchInput.addEventListener('input', handleSearchInput);
    }

    // --- UI & NAVIGATION FUNCTIONS ---
    function toggleMobileMenu() {
        const isActive = elements.hamburgerCheckbox.checked;
        elements.mobileNav.classList.toggle('active', isActive);
        elements.mobileNavBackdrop.classList.toggle('active', isActive);
    }

    function toggleMobileSearch() {
        elements.headerCenter.classList.toggle('mobile-active');
        if (elements.headerCenter.classList.contains('mobile-active')) {
            elements.searchBackdrop.classList.add('active');
            elements.searchInput.focus();
        } else {
            closeSearch();
        }
    }

    function closeSearch() {
        elements.searchInput.value = '';
        elements.searchResults.classList.remove('active');
        elements.searchBackdrop.classList.remove('active');
        elements.headerCenter.classList.remove('mobile-active');
    }

    let searchDebounceTimer;
    function handleSearchInput(e) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length > 1) {
                const filtered = allCourses.filter(c => c.title.toLowerCase().includes(query) || c.subtitle.toLowerCase().includes(query));
                displaySearchResults(filtered);
            } else {
                elements.searchResults.classList.remove('active');
            }
        }, 300);
    }

    function displaySearchResults(results) {
        elements.searchBackdrop.classList.add('active');
        if (results.length > 0) {
            elements.searchResults.innerHTML = results.map(course => `
                <a href="${course.id}.html" class="search-result-item">
                    <h4>${course.title}</h4>
                </a>`).join('');
        } else {
            elements.searchResults.innerHTML = `<div class="no-results-message">No courses found.</div>`;
        }
        elements.searchResults.classList.add('active');
    }

    // --- AUTHENTICATION FUNCTIONS ---
    function openAuthModal() { elements.authModal.classList.add('active'); }
    function closeAuthModal() { elements.authModal.classList.remove('active'); }

    async function handleAuthStateChange(user) {
        if (user) {
            const userDoc = await firebase.firestore().collection("users").doc(user.uid).get();
            currentUser = userDoc.exists() ? { ...user, ...userDoc.data() } : user;
            isSubscribed = userDoc.exists() ? userDoc.data().subscription || false : false;
        } else {
            currentUser = null;
            isSubscribed = false;
        }
        updateUIForAuthState();
    }

    function updateUIForAuthState() {
        if (currentUser) {
            const displayName = currentUser.username || currentUser.displayName || 'Farmer';
            elements.userName.textContent = displayName;
            elements.userActionText.textContent = 'Logout';
            if (currentUser.photoURL) {
                elements.userAvatar.innerHTML = `<img src="${currentUser.photoURL}" alt="${displayName}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                elements.userAvatar.innerHTML = displayName.charAt(0).toUpperCase();
            }
        } else {
            elements.userName.textContent = 'Guest';
            elements.userActionText.textContent = 'Login';
            elements.userAvatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        }
        updateCrownIcon();
    }

    function updateCrownIcon() {
        const existingCrown = elements.userProfile.querySelector('.crown-icon');
        if (isSubscribed && !existingCrown) {
            const crown = document.createElement('span');
            crown.className = 'crown-icon';
            crown.innerHTML = '👑';
            elements.userProfile.prepend(crown);
        } else if (!isSubscribed && existingCrown) {
            existingCrown.remove();
        }
    }

    async function handleAuthSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const username = document.getElementById('authUsername').value;
        elements.authSubmitBtn.disabled = true;

        try {
            if (currentAuthMode === 'signup') {
                if (!username) throw new Error("Username is required");
                const userCred = await firebase.auth().createUserWithEmailAndPassword(email, password);
                await userCred.user.updateProfile({ displayName: username });
                await firebase.firestore().collection('users').doc(userCred.user.uid).set({
                    username,
                    email: userCred.user.email,
                    createdAt: new Date(),
                    subscription: false
                });
            } else {
                await firebase.auth().signInWithEmailAndPassword(email, password);
            }
            closeAuthModal();
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            elements.authSubmitBtn.disabled = false;
        }
    }

    async function handleGoogleSignIn() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const user = result.user;
            const userDocRef = firebase.firestore().collection('users').doc(user.uid);
            const userDoc = await userDocRef.get();

            if (!userDoc.exists()) {
                let username = prompt("Welcome! Please choose a username.", user.displayName.split(' ')[0] || '');
                if (username) {
                    await userDocRef.set({
                        username,
                        email: user.email,
                        createdAt: new Date(),
                        subscription: false
                    });
                }
            }
            closeAuthModal();
        } catch (error) {
            alert(`Google Sign-In Error: ${error.message}`);
        }
    }

    async function handleLogout() {
        if (confirm("Are you sure you want to log out?")) {
            await firebase.auth().signOut();
        }
    }

    function switchAuthMode(mode, initial = false) {
        if (!initial) currentAuthMode = mode;
        const isSignup = currentAuthMode === 'signup';
        elements.authTitle.textContent = isSignup ? 'Create Account' : 'Welcome Back';
        elements.authSubtitle.textContent = isSignup ? 'Join successful farmers today' : 'Sign in to access your courses';
        elements.authSubmitBtn.textContent = isSignup ? 'Create Account' : 'Sign In';
        elements.authSwitchText.textContent = isSignup ? 'Already have an account?' : "Don't have an account?";
        elements.authSwitchLink.textContent = isSignup ? 'Sign in' : 'Sign up';
        elements.usernameGroup.classList.toggle('hidden', !isSignup);
    }
});
