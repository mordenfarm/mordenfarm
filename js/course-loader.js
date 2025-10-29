
// --- UNIVERSAL COURSE LOADER SCRIPT ---
// This script is designed to be used by all individual course pages.
// It determines the course ID from the page's URL, fetches the corresponding
// data from Firestore, and dynamically populates the page content.

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT REFERENCES ---
    const loader = document.getElementById('loader');
    const errorContainer = document.getElementById('error-container');
    const errorTitle = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');
    const contentWrapper = document.getElementById('course-content-wrapper');

    // --- FIREBASE INITIALIZATION ---
    if (typeof firebaseConfig === 'undefined') {
        showError("Configuration Error", "Firebase configuration is missing.");
        return;
    }

    try {
        const app = firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore(app);
        console.log("Firebase initialized for course page.");
        initCoursePage(db); // Start the page logic
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        showError("Initialization Failed", "Could not connect to the database.");
    }

    // --- COURSE PAGE INITIALIZATION ---
    function initCoursePage(db) {
        showLoader();
        const courseId = getCourseIdFromURL();

        if (courseId) {
            fetchCourseData(db, courseId);
        } else {
            showError("No Course Specified", "Could not determine the course from the URL.");
        }
    }

    // --- DATA FETCHING ---
    async function fetchCourseData(db, courseId) {
        try {
            const courseDocRef = db.collection("courses").doc(courseId);
            const docSnap = await courseDocRef.get();

            if (docSnap.exists()) {
                const data = docSnap.data();
                document.title = `${data.title || 'Course'} | Modern Farmer`;
                renderCourseData(data);
                showContent();
            } else {
                console.warn(`No course document found for ID: ${courseId}`);
                showError("Content Not Found", `The course '${courseId}' could not be found. It may be under development or the link is incorrect.`);
            }
        } catch (error) {
            console.error("Error fetching course data:", error);
            showError("Loading Error", "An unexpected error occurred while fetching the course content.");
        }
    }

    // --- UI RENDERING ---
    function renderCourseData(data) {
        // Populate Hero Section
        document.getElementById('course-title').textContent = data.title || 'Course Title Not Provided';
        document.getElementById('course-subtitle').textContent = data.subtitle || 'An exciting learning opportunity.';

        // Populate Description
        document.getElementById('course-description').textContent = data.description || 'No description is available for this course.';

        // Populate Notes
        const notesContainer = document.getElementById('notes-list-container');
        notesContainer.innerHTML = ''; // Clear previous content
        if (data.notes && data.notes.length > 0) {
            data.notes.forEach(note => {
                const noteEl = document.createElement('li');
                noteEl.className = 'note-item';
                noteEl.innerHTML = `
                    <h3>${note.title || 'Untitled Note'}</h3>
                    <p>${note.content || 'No content provided for this note.'}</p>
                `;
                notesContainer.appendChild(noteEl);
            });
        } else {
            notesContainer.innerHTML = '<p>No course notes have been added yet.</p>';
        }

        // Populate Videos
        const videosContainer = document.getElementById('videos-grid-container');
        videosContainer.innerHTML = '';
        if (data.videos && data.videos.length > 0) {
            data.videos.forEach(video => {
                const embedUrl = getYouTubeEmbedUrl(video.url);
                if (embedUrl) { // Only render if the URL is valid
                    const videoEl = document.createElement('div');
                    videoEl.className = 'video-card';
                    videoEl.innerHTML = `
                        <div class="video-thumbnail">
                            <iframe src="${embedUrl}" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                        </div>
                        <div class="video-card-info">
                            <h3>${video.title || 'Untitled Video'}</h3>
                        </div>`;
                    videosContainer.appendChild(videoEl);
                }
            });
        } else {
            videosContainer.innerHTML = '<p>No videos have been added for this course yet.</p>';
        }
    }

    // --- UTILITY FUNCTIONS ---
    function getCourseIdFromURL() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();
        return filename.replace('.html', ''); // e.g., "broiler-rearing.html" -> "broiler-rearing"
    }

    function getYouTubeEmbedUrl(url) {
        if (!url) return null;
        let videoId = null;
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else if (urlObj.hostname.includes('youtube.com')) {
                videoId = urlObj.searchParams.get('v');
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        } catch (error) {
            console.error("Invalid video URL provided:", url);
            return null;
        }
    }

    // --- UI STATE MANAGEMENT ---
    function showLoader() {
        loader.style.display = 'flex';
        errorContainer.style.display = 'none';
        contentWrapper.style.display = 'none';
    }

    function showError(title, message) {
        errorTitle.textContent = title;
        errorMessage.textContent = message;
        loader.style.display = 'none';
        errorContainer.style.display = 'block';
        contentWrapper.style.display = 'none';
    }

    function showContent() {
        loader.style.display = 'none';
        errorContainer.style.display = 'none';
        contentWrapper.style.display = 'block';
    }
});
