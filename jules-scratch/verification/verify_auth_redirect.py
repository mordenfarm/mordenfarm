
import os
import re
from playwright.sync_api import sync_playwright, expect

def run_verification():
    """
    Navigates to the protected notes page and verifies that the user is
    redirected back to the index page because they are not logged in.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Construct the absolute file path for the notes.html page
        # This is necessary for Playwright to correctly load local files.
        notes_page_path = "file://" + os.path.abspath("notes.html")

        # Go to the notes page directly
        page.goto(notes_page_path)

        # The authentication guard should immediately redirect to index.html.
        # We verify this by checking that the final URL of the page ends with "index.html".
        expect(page).to_have_url(re.compile(r".*index\.html$"))

        # Assert that a known STATIC element from the index page is visible.
        # This confirms the redirect was successful without relying on dynamic content.
        expect(page.get_by_text("© 2025 Modern Farmer by ALFA OCTAL SYSTEMS.")).to_be_visible()

        # Capture a screenshot to visually confirm the redirect.
        screenshot_path = "jules-scratch/verification/redirect_verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run_verification()
