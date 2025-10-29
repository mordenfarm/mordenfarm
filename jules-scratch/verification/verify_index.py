import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        # Construct the absolute path to the file
        file_path = "file://" + os.path.abspath("index.html")
        page.goto(file_path)
        page.wait_for_timeout(2000)  # Wait for 2 seconds to ensure dynamic content loads
        page.screenshot(path="jules-scratch/verification/index.png")
        browser.close()

run()
