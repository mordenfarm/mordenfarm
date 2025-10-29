
from playwright.sync_api import sync_playwright, Page, expect
from pathlib import Path

def verify_homepage(page: Page):
    """
    This script verifies that the main page (index.html) loads correctly,
    and that the course cards are dynamically populated from the local array.
    """
    # 1. Arrange: Go to the index.html page.
    # We use file:// to load the local file directly.
    file_path = Path("index.html").resolve()
    page.goto(f"file://{file_path}")

    # 2. Act & Assert: Check for the presence and content of a specific course card.
    # We expect the course grid to be populated by the populateStaticContent() function on page load.

    # Wait for the course grid to appear
    course_grid = page.locator(".course-grid")
    expect(course_grid).to_be_visible()

    # Locate the "Broiler Chicken Rearing" course card
    broiler_card = course_grid.locator(".course-card", has_text="Broiler Chicken Rearing")

    # Expect the card to be visible
    expect(broiler_card).to_be_visible()

    # Expect the card to contain the correct title and description
    expect(broiler_card.locator("h3")).to_contain_text("Broiler Chicken Rearing")
    expect(broiler_card.locator("p")).to_contain_text("Master the 7-week profit cycle")

    # 3. Screenshot: Capture the final result for visual verification.
    screenshot_path = "jules-scratch/verification/verification.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_homepage(page)
        finally:
            browser.close()

if __name__ == "__main__":
    main()
