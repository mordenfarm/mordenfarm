from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto("file:///app/payment.html?uid=testuser")
    page.wait_for_function("document.querySelector('#unlockButton').disabled === false")
    page.click("#unlockButton")
    page.wait_for_selector(".payment-modal-backdrop.active")
    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)