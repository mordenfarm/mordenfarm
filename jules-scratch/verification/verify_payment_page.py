import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the local payment.html file
        await page.goto(f"file:///{os.path.abspath('payment.html')}")

        # Directly enable the button and open the modal with JavaScript
        await page.evaluate("""
            () => {
                const unlockButton = document.getElementById('unlockButton');
                unlockButton.disabled = false;

                const loginPrompt = document.getElementById('loginPrompt');
                loginPrompt.classList.remove('active');

                const paymentModal = document.getElementById('paymentModalBackdrop');
                paymentModal.classList.add('active');
            }
        """)

        # Wait for the payment modal to be visible
        payment_modal = page.locator("#paymentModalBackdrop")
        await expect(payment_modal).to_be_visible()

        # Take a screenshot of the payment modal
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == "__main__":
    import os
    asyncio.run(main())