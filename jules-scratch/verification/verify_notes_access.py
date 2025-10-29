
import os
from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Get the absolute path to the index.html file
        index_path = "file://" + os.path.abspath("index.html")
        page.goto(index_path)

        # Click on the first course card
        page.locator(".course-card").first.click()

        # Wait for the new page to load and check the title
        expect(page).to_have_title("Course Notes | AlfaOctal Campus")

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/notes_page.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
