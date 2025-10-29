
import os
from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Listen for and print all console events
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

    # 1. Navigate to the index.html page using the local web server.
    page.goto("http://localhost:8000/index.html")

    # 2. Verify that the course cards are being loaded from Firestore.
    # We'll wait for at least one course card to appear.
    expect(page.locator(".course-card").first).to_be_visible(timeout=10000)

    # Take a screenshot of the index page to show courses are loaded.
    page.screenshot(path="jules-scratch/verification/index_page_loaded.png")

    # 3. Click on the "Broiler Rearing" course card.
    broiler_card = page.locator('a[href="broiler-rearing.html"]')
    broiler_card.click()

    # 4. Wait for navigation to the broiler-rearing.html page.
    expect(page).to_have_url("http://localhost:8000/broiler-rearing.html", timeout=10000)

    # 5. Verify that the course content is loaded correctly from Firestore.
    # We'll check for the presence of the course title.
    expect(page.locator("#course-title")).to_have_text("Broiler Chicken Rearing", timeout=10000)

    # 6. Take a screenshot of the broiler rearing page.
    page.screenshot(path="jules-scratch/verification/broiler_rearing_page_loaded.png")

    browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)
