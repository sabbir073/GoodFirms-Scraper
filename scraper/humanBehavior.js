const { By, Key, until } = require('selenium-webdriver');

// Human-like typing, clicking, mouse movement
class HumanBehavior {
  constructor(driver) {
    this.driver = driver;
  }

  async typeHuman(element, text, minDelay = 50, maxDelay = 150) {
    await element.clear();
    for (let i = 0; i < text.length; i++) {
      await element.sendKeys(text[i]);
      const delay = Math.random() * (maxDelay - minDelay) + minDelay;
      await this.driver.sleep(delay);
    }
  }

  async clickHuman(element) {
    await this.driver.executeScript('arguments[0].scrollIntoView(true);', element);
    await this.driver.sleep(Math.random() * 500 + 200);
    await element.click();
  }

  async waitForElement(selector, timeout = 10000) {
    return await this.driver.wait(until.elementLocated(By.css(selector)), timeout);
  }

  async sleep(minMs = 1000, maxMs = 3000) {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await this.driver.sleep(delay);
  }

  async randomSleep() {
    await this.sleep(500, 2000);
  }
}

module.exports = HumanBehavior; 