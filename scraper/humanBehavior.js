// Human-like typing, clicking, mouse movement using Puppeteer
class HumanBehavior {
  constructor(page) {
    this.page = page;
  }

  async typeHuman(selector, text, minDelay = 50, maxDelay = 150) {
    await this.page.click(selector);
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyA');
    await this.page.keyboard.up('Control');
    
    for (let i = 0; i < text.length; i++) {
      await this.page.keyboard.type(text[i]);
      const delay = Math.random() * (maxDelay - minDelay) + minDelay;
      await this.page.waitForTimeout(delay);
    }
  }

  async clickHuman(selector) {
    await this.page.waitForSelector(selector);
    await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, selector);
    
    await this.page.waitForTimeout(Math.random() * 500 + 200);
    await this.page.click(selector);
  }

  async waitForElement(selector, timeout = 10000) {
    return await this.page.waitForSelector(selector, { timeout });
  }

  async sleep(minMs = 1000, maxMs = 3000) {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await this.page.waitForTimeout(delay);
  }

  async randomSleep() {
    await this.sleep(500, 2000);
  }
}

module.exports = HumanBehavior; 