from playwright.sync_api import sync_playwright, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Test user credentials
    email = "testuser@example.com"
    password = "password123"
    username = "testuser"

    # Navigate to the index page
    index_path = "file://" + os.path.abspath("index.html")
    page.goto(index_path)

    # --- Sign up a new user ---
    page.locator("#userProfile").click()
    page.locator("#authSwitchLink").click()
    page.locator("#authUsername").fill(username)
    page.locator("#authEmail").fill(email)
    page.locator("#authPassword").fill(password)
    page.locator("#authSubmitBtn").click()

    # Wait for signup to complete and close the modal
    page.wait_for_function("window.currentUser !== null")
    page.locator("#closeAuthModal").click()

    # --- Log out ---
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator("#userProfile").click()
    page.wait_for_function("window.currentUser === null")


    # --- Log in as the new user ---
    page.locator("#userProfile").click()
    page.locator("#authEmail").fill(email)
    page.locator("#authPassword").fill(password)
    page.locator("#authSubmitBtn").click()
    page.wait_for_function("window.currentUser !== null")
    page.locator("#closeAuthModal").click()


    # Navigate to the payment page
    payment_path = "file://" + os.path.abspath("payment.html")
    page.goto(payment_path)

    # Wait for the payment section to be visible
    payment_section = page.locator("#payment-section")
    expect(payment_section).to_be_visible(timeout=15000)

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)