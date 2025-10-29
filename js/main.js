
import { seedDatabase } from './db-seed.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & DATA ---
    let currentUser = null;
    let isSubscribed = false;
    let currentAuthMode = 'signin';
    let allCourses = [];

    // --- DOM ELEMENTS ---
    const elements = {
        views: document.querySelectorAll('.view-section'),
        courseGrid: document.querySelector('.course-grid'),
        testimonialsGrid: document.querySelector('.testimonials-grid'),
        contactGrid: document.querySelector('.contact-grid'),
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
        slider: document.querySelector('.slide'),
        sliderNextBtn: document.querySelector('.slider-button .next'),
        sliderPrevBtn: document.querySelector('.slider-button .prev'),
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

    // --- FIREBASE INITIALIZATION ---
    function initializeFirebase() {
        if (typeof firebaseConfig === 'undefined' || typeof firebase === 'undefined') {
            console.error("Firebase config or SDK is not defined. App cannot start.");
            return;
        }
        try {
            firebase.initializeApp(firebaseConfig);
            initializeAppLogic();
        } catch (error) {
            if (error.code === 'app/duplicate-app') {
                initializeAppLogic();
            } else {
                console.error("Firebase initialization failed:", error);
            }
        }
    }

    // --- APPLICATION LOGIC ---
    async function initializeAppLogic() {
        const db = firebase.firestore();
        await seedDatabase(db);
        await fetchAndRenderCourses(db);

        initializeEventListeners();
        firebase.auth().onAuthStateChanged(handleAuthStateChange);
        switchAuthMode('signin', true);
    }

    async function fetchAndRenderCourses(db) {
        try {
            const snapshot = await db.collection("courses").get();
            allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            populateDynamicContent();
        } catch (error) {
            console.error("Error fetching courses:", error);
            elements.courseGrid.innerHTML = `<p>Error loading courses.</p>`;
        }
    }

    function populateDynamicContent() {
        elements.courseGrid.innerHTML = allCourses.map(course => `
            <div class="course-card" data-course-id="${course.id}">
                <div class="card-thumbnail" style="background-image: url('${course.image}');"></div>
                <div class="card-info">
                    <h3><span>${course.title}</span></h3>
                    <p>${course.subtitle}</p>
                </div>
            </div>`).join('');

        const dropdownHTML = allCourses.map(course => `<a href="${course.id}.html">${course.title}</a>`).join('');
        elements.desktopCoursesDropdown.innerHTML = dropdownHTML;
        elements.mobileCoursesDropdown.innerHTML = dropdownHTML;

        elements.footerCourseLinks.innerHTML = allCourses.map(c => `<li><a href="${c.id}.html">${c.title}</a></li>`).join('');

        elements.slider.innerHTML = allCourses.map(c => `
            <div class="item" style="background-image: url('${c.image}');">
                <div class="content">
                    <div class="name">${c.title}</div>
                    <div class="des">${c.subtitle}</div>
                    <button class="cta-button" data-course-id="${c.id}">Learn More</button>
                </div>
            </div>`).join('');
    }

    // --- EVENT LISTENERS ---
    function initializeEventListeners() {
        document.body.addEventListener('click', handleGlobalClick);
        elements.hamburgerCheckbox.addEventListener('change', toggleMobileMenu);
        elements.mobileNavBackdrop.addEventListener('click', () => { elements.hamburgerCheckbox.checked = false; toggleMobileMenu(); });
        elements.mobileCoursesToggle.addEventListener('click', e => { e.preventDefault(); elements.mobileCoursesDropdown.classList.toggle('show'); });
        elements.searchInput.addEventListener('input', handleSearchInput);
        elements.closeAuthModal.addEventListener('click', closeAuthModal);
        elements.authModal.addEventListener('click', e => e.target === elements.authModal && closeAuthModal());
        elements.authForm.addEventListener('submit', handleAuthSubmit);
        elements.googleSignInBtn.addEventListener('click', handleGoogleSignIn);
        elements.authSwitchLink.addEventListener('click', e => { e.preventDefault(); switchAuthMode(currentAuthMode === 'signin' ? 'signup' : 'signin'); });
        elements.sliderNextBtn.addEventListener('click', () => elements.slider.appendChild(elements.slider.firstElementChild));
        elements.sliderPrevBtn.addEventListener('click', () => elements.slider.insertBefore(elements.slider.lastElementChild, elements.slider.firstElementChild));
    }

    function handleGlobalClick(e) {
        const courseCard = e.target.closest('.course-card, .cta-button');

        if (e.target.closest('#userProfile')) {
             currentUser ? handleLogout() : openAuthModal();
             return;
        }

        if (courseCard) {
            e.preventDefault();
            const courseId = courseCard.dataset.courseId;
            if (currentUser) {
                window.location.href = `${courseId}.html`;
            } else {
                openAuthModal();
            }
        }

        const navLink = e.target.closest('a');
        if (navLink && navLink.hash) {
            const targetId = navLink.hash;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    // --- UI FUNCTIONS ---
    function toggleMobileMenu() {
        const isActive = elements.hamburgerCheckbox.checked;
        elements.mobileNav.classList.toggle('active', isActive);
        elements.mobileNavBackdrop.classList.toggle('active', isActive);
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
        elements.searchResults.classList.add('active');
        if (results.length > 0) {
            elements.searchResults.innerHTML = results.map(course => `
                <div class="search-result-item" data-course-id="${course.id}">
                    <h4>${course.title}</h4>
                </div>`).join('');
        } else {
            elements.searchResults.innerHTML = `<div class="no-results-message">No courses found.</div>`;
        }
    }

    // --- AUTHENTICATION ---
    function openAuthModal() {
        elements.authModal.classList.add('active');
    }
    function closeAuthModal() { elements.authModal.classList.remove('active'); }

    async function handleAuthStateChange(user) {
        if (user) {
            const userDoc = await firebase.firestore().collection("users").doc(user.uid).get();
            currentUser = userDoc.exists() ? { ...user, ...userDoc.data() } : user;
            isSubscribed = userDoc.exists() && userDoc.data().subscription;
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
            elements.userAvatar.innerHTML = currentUser.photoURL ? `<img src="${currentUser.photoURL}" alt="${displayName}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : displayName.charAt(0).toUpperCase();
        } else {
            elements.userName.textContent = 'Guest';
            elements.userActionText.textContent = 'Login';
            elements.userAvatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
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
                if (!username) throw new Error("Username is required.");
                const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
                await cred.user.updateProfile({ displayName: username });
                await firebase.firestore().collection('users').doc(cred.user.uid).set({ username, email, createdAt: new Date(), subscription: false });
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
                const username = user.displayName.split(' ')[0] || 'User';
                await userDocRef.set({ username, email: user.email, createdAt: new Date(), subscription: false });
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
        const isSignup = mode === 'signup';
        elements.authTitle.textContent = isSignup ? 'Create Account' : 'Welcome Back';
        elements.authSubtitle.textContent = isSignup ? 'Join successful farmers' : 'Sign in to access your courses';
        elements.authSubmitBtn.textContent = isSignup ? 'Create Account' : 'Sign In';
        elements.authSwitchText.textContent = isSignup ? 'Already have an account?' : "Don't have an account?";
        elements.authSwitchLink.textContent = isSignup ? 'Sign in' : 'Sign up';
        elements.usernameGroup.classList.toggle('hidden', !isSignup);
    }

    // --- START ---
    initializeFirebase();
});
