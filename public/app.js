document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content-area');
    const coursePages = document.querySelectorAll('.course-page');
    const paymentSection = document.getElementById('payment-section');
    const coursesDropdown = document.getElementById('coursesDropdown');
    const loginSection = document.getElementById('login-section');
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const navMenu = document.getElementById('nav-menu-main');
    const searchIconBtn = document.getElementById('search-icon-btn');
    const searchBarContainer = document.getElementById('search-bar-container');

    // --- Reliable Hex Colors (for JavaScript use) ---
    const YT_RED = '#ff0000';
    const YT_GREEN = '#00cc66';

    // 🌟 INITIAL STATE: FALSE (UNSUBSCRIBED) 🌟
    let isSubscribed = false;

    function showView(targetId) {
        // Reset scroll position
        window.scrollTo({ top: 0, behavior: 'auto' });

        // 1. Hide all dynamic sections
        coursePages.forEach(page => page.style.display = 'none');
        paymentSection.style.display = 'none';
        loginSection.style.display = 'none';
        mainContent.style.display = 'block';

        const targetElement = document.querySelector(targetId);
        const targetIsCoursePage = targetElement && targetElement.classList.contains('course-page');

        // 2. Dynamic Course Page Content (Enrollment Button State)
        if (targetIsCoursePage && targetElement) {
            const enrollBtn = targetElement.querySelector('.enroll-btn');
            if (enrollBtn) {
                if (isSubscribed) {
                    // Subscribed State: Course is unlocked
                    enrollBtn.textContent = 'You are Enrolled! (View Dashboard)';
                    enrollBtn.href = '#home-section';
                    enrollBtn.style.backgroundColor = YT_RED;
                } else {
                    // Unsubscribed State: Call to action to enroll
                    enrollBtn.textContent = 'ENROLL NOW - Start Learning!';
                    enrollBtn.href = '#payment-section';
                    enrollBtn.style.backgroundColor = YT_GREEN;
                }
            }
        }

        // 3. Handle specific page views (Course, Payment, Login)
        if (targetIsCoursePage || targetId === '#payment-section' || targetId === '#login-section') {
            mainContent.style.display = 'none';
            if (targetElement) {
                targetElement.style.display = 'block';
            }
        } else if (targetElement && targetId !== '#home-section') {
            // 4. Handle smooth scroll for internal sections on the main page
             setTimeout(() => {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
            }, 50);
        }
    }

    // --- MASTER CLICK HANDLER FOR ALL # LINKS ---
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            let targetViewId = targetId;

            // 1. Handle Dropdown Toggle (The "COURSES" link) - Keeps click functionality for mobile/touch
            if (this.closest('.dropdown') && targetId === '#course-overview') {
                e.preventDefault();
                coursesDropdown.classList.toggle('show');
                return;
            }

            // 2. Prevent default link behavior for all navigational clicks
            e.preventDefault();
            coursesDropdown.classList.remove('show'); // Hide dropdown when any other link is clicked

            // 3. Subscription Check for Course Access
            if (this.classList.contains('course-link') && !isSubscribed) {
                alert('Subscription Required: Please enroll to access this course.');
                targetViewId = '#payment-section';
            } else if (this.classList.contains('course-link') && this.getAttribute('data-target')) {
                // If subscribed, proceed to the specific course page
                targetViewId = '#' + this.getAttribute('data-target');
            }

            showView(targetViewId);
        });
    });

    // --- Search Icon Click ---
    searchIconBtn.addEventListener('click', () => {
        searchBarContainer.classList.toggle('active');
    });

    // --- LIVE SEARCH FUNCTIONALITY ---
    const searchInput = document.getElementById('searchInput');
    const courseCards = document.querySelectorAll('.course-card');
    const noResultsMessage = document.getElementById('no-results-message');
    const mainContainer = document.querySelector('.container');

    searchInput.addEventListener('keyup', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        let visibleCourses = 0;

        if (searchTerm.length > 0) {
            mainContainer.classList.add('blur');
        } else {
            mainContainer.classList.remove('blur');
        }

        courseCards.forEach(card => {
            const title = card.querySelector('h2').textContent.toLowerCase();
            const description = card.querySelector('p').textContent.toLowerCase();

            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                card.style.display = 'block';
                card.classList.add('animate-in');
                visibleCourses++;
            } else {
                card.style.display = 'none';
                card.classList.remove('animate-in');
            }
        });

        if (visibleCourses === 0 && searchTerm.length > 0) {
            noResultsMessage.style.display = 'block';
            noResultsMessage.classList.add('shake');
        } else {
            noResultsMessage.style.display = 'none';
            noResultsMessage.classList.remove('shake');
        }
    });

    mainContainer.addEventListener('click', (e) => {
        if (!e.target.closest('.course-card') && !e.target.closest('.search-bar')) {
            mainContainer.classList.remove('blur');
            courseCards.forEach(card => {
                card.style.display = 'block';
                card.classList.remove('animate-in');
            });
            searchInput.value = '';
            noResultsMessage.style.display = 'none';
        }
    });

    // --- HAMBURGER MENU TOGGLE ---
    hamburgerIcon.addEventListener('click', () => {
        navMenu.classList.toggle('mobile-active');
    });

    // --- CLOSE MOBILE MENU ON LINK CLICK ---
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('mobile-active')) {
                navMenu.classList.remove('mobile-active');
            }
        });
    });

    // --- Auth Modal Logic ---
    const authIconBtn = document.getElementById('auth-icon-btn');
    const authModal = document.getElementById('auth-modal');
    const closeModalBtn = document.getElementById('close-auth-modal');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');

    authIconBtn.addEventListener('click', () => {
        authModal.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', () => {
        authModal.style.display = 'none';
    });

    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.add('slide-out');
        setTimeout(() => {
            loginView.style.display = 'none';
            loginView.classList.remove('slide-out');
            signupView.style.display = 'block';
            signupView.classList.add('slide-in');
        }, 500);
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupView.classList.add('slide-out');
        setTimeout(() => {
            signupView.style.display = 'none';
            signupView.classList.remove('slide-out');
            loginView.style.display = 'block';
            loginView.classList.add('slide-in');
        }, 500);
    });

    // --- Firebase Auth Logic ---
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const authText = document.querySelector('.auth-text');
    const userIcon = document.querySelector('.user-icon');

    const { auth, db, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged, collection, doc, setDoc, getDoc } = window.firebase;

    // Handle user sign-up
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = signupForm['signup-username'].value;
        const email = signupForm['signup-email'].value;
        const password = signupForm['signup-password'].value;

        createUserWithEmailAndPassword(auth, email, password)
            .then(cred => {
                const userDoc = doc(db, 'users', cred.user.uid);
                return setDoc(userDoc, { username: username });
            })
            .then(() => {
                authModal.style.display = 'none';
            })
            .catch(err => {
                alert(err.message);
            });
    });

    // Handle user login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                authModal.style.display = 'none';
            })
            .catch(err => {
                alert(err.message);
            });
    });

    // Handle Google login
    googleLoginBtn.addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then(() => {
                authModal.style.display = 'none';
            })
            .catch(err => {
                alert(err.message);
            });
    });

    // Listen for auth state changes
    onAuthStateChanged(auth, user => {
        if (user) {
            // User is signed in
            const userDoc = doc(db, 'users', user.uid);
            getDoc(userDoc).then(doc => {
                if (!doc.exists()) {
                    // New Google user, prompt for username
                    const username = prompt('Please enter a username:');
                    if (username) {
                        fetch('/.netlify/functions/update-username', {
                            method: 'POST',
                            body: JSON.stringify({ userId: user.uid, username: username })
                        }).then(() => {
                            authText.textContent = username;
                            userIcon.textContent = username.charAt(0).toUpperCase();
                            userIcon.style.backgroundColor = getRandomColor();
                        });
                    }
                } else {
                    if (user.photoURL) {
                        userIcon.innerHTML = `<img src="${user.photoURL}" alt="User" style="width: 100%; height: 100%; border-radius: 50%;">`;
                    } else {
                        const username = doc.data().username;
                        userIcon.textContent = username.charAt(0).toUpperCase();
                        userIcon.style.backgroundColor = getRandomColor();
                    }
                    authText.textContent = doc.data().username;
                }
            });
        } else {
            // User is signed out
            authText.textContent = 'Login';
            userIcon.innerHTML = `&#128100;`;
            userIcon.style.backgroundColor = 'transparent';
        }
    });

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Initialize: Set initial nav state and show home view
    showView('#home-section');
});