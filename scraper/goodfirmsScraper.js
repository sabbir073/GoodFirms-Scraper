const { By, Key, until } = require('selenium-webdriver');
const HumanBehavior = require('./humanBehavior');
const selectors = require('./selectors');
const { writeCompanyRow, writeReviewRow } = require('../sheets/writer');

const ITEMS_PER_PAGE = parseInt(process.env.MAX_ITEMS_PER_PAGE) || 5;
const PAGES_TO_SCRAPE = parseInt(process.env.MAX_PAGES) || 2;

class GoodFirmsScraper {
  constructor(driver) {
    this.driver = driver;
    this.human = new HumanBehavior(driver);
  }

  async scrapeCompanyData() {
    // Company Name
    let companyName = '';
    try {
      // Try multiple selectors for company name
      try {
        companyName = await this.driver.findElement(By.css(selectors.company.name)).getText();
      } catch (e) {
        for (const fallbackSelector of selectors.company.nameFallbacks) {
          try {
            companyName = await this.driver.findElement(By.css(fallbackSelector)).getText();
            break;
          } catch (e2) {
            continue;
          }
        }
        if (!companyName) {
          // Try to get from page title as fallback
          const pageTitle = await this.driver.getTitle();
          companyName = pageTitle.split(' - ')[0] || pageTitle.split(' | ')[0] || '';
        }
      }
      console.log(`🏢 Company name captured: "${companyName}"`);
    } catch (e) {
      companyName = '';
      console.log(`❌ Failed to capture company name: ${e.message}`);
    }
    console.log(`🏢 Scraping data for: ${companyName}`);

    // Total Reviews
    let totalReviews = '';
    try {
      totalReviews = await this.driver.findElement(By.css(selectors.company.totalReviews)).getText();
    } catch (e) {
      totalReviews = '';
    }

    // Rating
    let rating = '';
    try {
      rating = await this.driver.findElement(By.css(selectors.company.rating)).getText();
    } catch (e) {
      rating = '';
    }

    // Website URL
    let website = '';
    try {
      website = await this.driver.findElement(By.css(selectors.company.website)).getAttribute('href');
    } catch (e) {
      website = '';
    }

    // Address and Phone
    let address = '';
    let phone = '';
    try {
      const street = await this.driver.findElement(By.css(selectors.company.address.street)).getText();
      const localityElements = await this.driver.findElements(By.css(selectors.company.address.locality));
      let localities = [];
      for (const el of localityElements) {
        localities.push(await el.getText());
      }
      const postalCode = await this.driver.findElement(By.css(selectors.company.address.postalCode)).getText();
      const country = await this.driver.findElement(By.css(selectors.company.address.country)).getText();
      address = `${street}, ${localities.join(', ')}, ${postalCode}, ${country}`;
    } catch (e) {
      address = '';
    }
    try {
      phone = await this.driver.findElement(By.css(selectors.company.phone)).getText();
    } catch (e) {
      phone = '';
    }

    // Service Focus
    let serviceFocus = '';
    try {
      const serviceItems = await this.driver.findElements(By.css(selectors.company.serviceFocus));
      let focusArr = [];
      for (const item of serviceItems) {
        const spans = await item.findElements(By.css('span'));
        if (spans.length >= 2) {
          const name = await spans[0].getText();
          const percent = await spans[1].getText();
          focusArr.push(`${name} - ${percent}`);
        }
      }
      serviceFocus = focusArr.join('; ');
    } catch (e) {
      serviceFocus = '';
    }

    // Industry Focus
    let industryFocus = '';
    try {
      const industryItems = await this.driver.findElements(By.css(selectors.company.industryFocus));
      let industryArr = [];
      for (const item of industryItems) {
        industryArr.push(await item.getText());
      }
      industryFocus = industryArr.join('; ');
    } catch (e) {
      industryFocus = '';
    }

    // Client Focus
    let clientFocus = '';
    try {
      const clientItems = await this.driver.findElements(By.css(selectors.company.clientFocus));
      let clientArr = [];
      for (const item of clientItems) {
        const text = await item.getText();
        clientArr.push(text);
      }
      clientFocus = clientArr.join('; ');
    } catch (e) {
      clientFocus = '';
    }

    // Write company row
    await writeCompanyRow({
      companyName, totalReviews, rating, website, address, phone, serviceFocus, industryFocus, clientFocus
    });

    return companyName;
  }

  async scrapeReviews(companyName) {
    let hasMoreReviews = true;
    let pageNumber = 1;
    let processedReviews = new Set(); // Track processed reviews to avoid duplicates
    const MAX_REVIEW_PAGES = 10; // Prevent infinite loops
    
    while (hasMoreReviews) {
      try {
        // Wait for reviews list to be present
        await this.driver.wait(until.elementLocated(By.css(selectors.reviews.container)), 5000);
        const reviewArticles = await this.driver.findElements(By.css(selectors.reviews.reviewItems));
        console.log(`📝 Found ${reviewArticles.length} reviews on page ${pageNumber}`);

        // Check if we're getting duplicate reviews (indicates we're stuck in a loop)
        let newReviewsCount = 0;

                  for (const review of reviewArticles) {
            // Reviewer Name
            let reviewerName = '';
            try {
              reviewerName = await review.findElement(By.css(selectors.reviews.reviewerName)).getText();
            } catch (e) {}

            // Date Posted (visible)
            let datePosted = '';
            try {
              datePosted = await review.findElement(By.css(selectors.reviews.datePosted)).getText();
            } catch (e) {}

            // Date Published (exact, from meta)
            let datePublished = '';
            try {
              datePublished = await review.findElement(By.css(selectors.reviews.datePublished)).getAttribute('content');
            } catch (e) {}

            // Rating
            let ratingGiven = '';
            try {
              const ratingSpan = await review.findElement(By.css(selectors.reviews.rating));
              const style = await ratingSpan.getAttribute('style');
              const match = style.match(/width:\s*(\d+)%/);
              if (match) {
                const percent = parseInt(match[1], 10);
                ratingGiven = (percent / 20).toFixed(1); // 100% = 5.0
              }
            } catch (e) {}

            // Create a unique identifier for this review
            const reviewId = `${reviewerName}-${datePosted}-${datePublished}`;
            
            // Only process if we haven't seen this review before
            if (!processedReviews.has(reviewId)) {
              processedReviews.add(reviewId);
              newReviewsCount++;
              
              // Write review row
              console.log(`📝 Writing review for company: "${companyName}"`);
              await writeReviewRow({
                companyName,
                reviewerName,
                datePosted,
                datePublished,
                ratingGiven
              });
            } else {
              console.log(`⚠️ Skipping duplicate review: ${reviewerName}`);
            }
          }

        // Check if we found any new reviews on this page
        if (newReviewsCount === 0) {
          console.log('⚠️ No new reviews found on this page, likely reached the end');
          hasMoreReviews = false;
        } else {
          console.log(`✅ Processed ${newReviewsCount} new reviews on page ${pageNumber}`);
        }

        // Check if we've reached the maximum page limit
        if (pageNumber >= MAX_REVIEW_PAGES) {
          console.log(`⚠️ Reached maximum review pages limit (${MAX_REVIEW_PAGES}), stopping pagination`);
          hasMoreReviews = false;
        }

        // Review pagination: check for next page button with improved handling
        if (hasMoreReviews) {
          let nextPageBtn;
          try {
            nextPageBtn = await this.driver.findElement(By.css(selectors.reviews.nextPageButton));
          } catch (e) {
            // Try fallback selectors
            for (const fallbackSelector of selectors.reviews.nextPageButtonFallbacks) {
              try {
                nextPageBtn = await this.driver.findElement(By.css(fallbackSelector));
                console.log(`✅ Found next page button with fallback selector: ${fallbackSelector}`);
                break;
              } catch (e2) {
                continue;
              }
            }
            if (!nextPageBtn) {
              console.log('❌ No next page button found with any selector');
            }
          }
          
          if (nextPageBtn) {
            console.log(`📄 Moving to page ${pageNumber + 1} of reviews...`);
            
            // Scroll to the button and wait for any overlays to clear
            await this.driver.executeScript('arguments[0].scrollIntoView(true);', nextPageBtn);
            await this.driver.sleep(1000);
            
            // Try multiple approaches to click the next page button
            let clicked = false;
            
            // Approach 1: Direct click
            try {
              await nextPageBtn.click();
              clicked = true;
              console.log('✅ Next page clicked successfully');
            } catch (e) {
              console.log('⚠️ Direct click failed, trying JavaScript click...');
            }
            
            // Approach 2: JavaScript click
            if (!clicked) {
              try {
                await this.driver.executeScript('arguments[0].click();', nextPageBtn);
                clicked = true;
                console.log('✅ Next page clicked via JavaScript');
              } catch (e) {
                console.log('⚠️ JavaScript click failed, trying href navigation...');
              }
            }
            
            // Approach 3: Navigate directly using href
            if (!clicked) {
              try {
                const href = await nextPageBtn.getAttribute('data-href');
                if (href && href !== 'javascript:;') {
                  await this.driver.get(href);
                  clicked = true;
                  console.log('✅ Navigated to next page via href');
                }
              } catch (e) {
                console.log('⚠️ Href navigation failed');
              }
            }
            
            if (clicked) {
              pageNumber++;
              await this.driver.sleep(2000);
            } else {
              console.log('❌ Could not navigate to next page, stopping review pagination');
              hasMoreReviews = false;
            }
          } else {
            console.log('✅ No more review pages');
            hasMoreReviews = false;
          }
        }
      } catch (e) {
        console.log('⚠️ Error processing reviews:', e.message);
        hasMoreReviews = false;
      }
    }
  }

  async searchAndScrape(keyword, location) {
    console.log(`🔍 Processing: "${keyword}" in "${location}"`);
    try {
      console.log('🌐 Opening GoodFirms homepage...');
      await this.driver.get('https://www.goodfirms.co/');
      console.log('✅ GoodFirms homepage loaded');

      // Enter keyword
      console.log('🔤 Entering keyword...');
      const searchInput = await this.driver.findElement(By.css(selectors.search.keywordInput));
      await searchInput.clear();
      await this.driver.sleep(500);
      
      // Click on the input to ensure it's focused
      await searchInput.click();
      await this.driver.sleep(300);
      
      // Type the keyword character by character to avoid auto-suggestions
      await this.human.typeHuman(searchInput, keyword);
      console.log(`✅ Keyword "${keyword}" entered`);
      
      // Wait a moment for any suggestions to appear
      await this.driver.sleep(1000);
      
      // Check if there are any suggestion dropdowns and dismiss them
      try {
        const suggestions = await this.driver.findElements(By.css('.suggestion-item, .autocomplete-item, [class*="suggestion"], [class*="autocomplete"]'));
        if (suggestions.length > 0) {
          console.log('⚠️ Found suggestions, pressing Escape to dismiss...');
          await searchInput.sendKeys(Key.ESCAPE);
          await this.driver.sleep(500);
        }
      } catch (e) {
        // No suggestions found, continue
      }
      
      // Alternative approach: Try to find and click a search button instead of pressing Enter
      try {
        const searchButton = await this.driver.findElement(By.css('button[type="submit"], .search-btn, [class*="search"] button'));
        console.log('🔍 Found search button, clicking it...');
        await searchButton.click();
        console.log('✅ Search submitted via button click');
      } catch (e) {
        // No search button found, use Enter key
        console.log('🔍 No search button found, using Enter key...');
        await searchInput.sendKeys(Key.ENTER);
        console.log('✅ Search submitted via Enter key');
      }

      // Enter location
      console.log('📍 Entering location...');
      const locationInput = await this.driver.findElement(By.css(selectors.search.locationInput));
      await locationInput.clear();
      await locationInput.sendKeys(location);
      console.log(`✅ Location "${location}" entered`);
      await locationInput.sendKeys(Key.ENTER);
      console.log('✅ Location submitted');

      await this.driver.sleep(1000);
      console.log('⏳ Waiting for search results...');
      
      // Debug: Check what was actually entered in the search field
      try {
        const actualKeyword = await searchInput.getAttribute('value');
        console.log(`🔍 Debug: Actual keyword in search field: "${actualKeyword}"`);
        if (actualKeyword !== keyword) {
          console.log(`⚠️ Warning: Expected "${keyword}" but found "${actualKeyword}" in search field`);
        }
      } catch (e) {
        console.log('⚠️ Could not verify search field value');
      }

      // Wait for manual Cloudflare verification
      console.log('⏰ Waiting 15 seconds for manual Cloudflare verification...');
      console.log('🔍 PLEASE COMPLETE ANY CAPTCHA OR VERIFICATION NOW!');
      console.log('🔍 The browser window should be visible - please interact with it if needed');

      try {
        await this.driver.sleep(15000);
        await this.driver.getCurrentUrl();
        const pageTitleAfterWait = await this.driver.getTitle();
        console.log(`📄 Page title after wait: ${pageTitleAfterWait}`);

        if (pageTitleAfterWait.includes('Just a moment') || pageTitleAfterWait.includes('Checking')) {
          console.log('⚠️ Cloudflare still blocking. Please complete verification manually and press Enter to continue...');
          await new Promise(resolve => {
            process.stdin.once('data', () => resolve());
          });
        }
      } catch (browserError) {
        console.error('❌ Browser was closed or disconnected during verification:', browserError.message);
        console.log('🔄 Restarting browser...');
        await this.driver.quit();
        const { connectChrome } = require('../chrome/connectChrome');
        this.driver = await connectChrome();
        this.human = new HumanBehavior(this.driver);
        console.log('✅ Browser restarted successfully');
      }

      // Debug: Check current URL and page content
      const currentUrl = await this.driver.getCurrentUrl();
      console.log(`🔗 Current URL: ${currentUrl}`);
      const pageTitle = await this.driver.getTitle();
      console.log(`📄 Page title: ${pageTitle}`);
      
      // Debug: Check if there's a search term or category displayed on the page
      try {
        const searchTermElements = await this.driver.findElements(By.css('h1, .search-term, .category-name, [class*="search"], [class*="category"]'));
        for (const element of searchTermElements) {
          const text = await element.getText();
          if (text && text.toLowerCase().includes('development')) {
            console.log(`🔍 Debug: Found search/category text: "${text}"`);
          }
        }
        
        // Additional check: Look for breadcrumbs or navigation that might show the search term
        const breadcrumbElements = await this.driver.findElements(By.css('.breadcrumb, .nav-breadcrumb, [class*="breadcrumb"]'));
        for (const element of breadcrumbElements) {
          const text = await element.getText();
          console.log(`🔍 Debug: Breadcrumb text: "${text}"`);
        }
      } catch (e) {
        console.log('⚠️ Could not check for search/category text');
      }
      
      // Verify we're on a search results page and check for wrong category
      const pageSource = await this.driver.getPageSource();
      const initialUrl = await this.driver.getCurrentUrl();
      const initialTitle = await this.driver.getTitle();
      
      // Check if we're on the wrong category page
      const isWrongCategory = (
        (pageSource.toLowerCase().includes('mobile app development') && !pageSource.toLowerCase().includes('web development')) ||
        initialUrl.includes('/app-development') ||
        initialTitle.toLowerCase().includes('mobile app development')
      );
      
      if (isWrongCategory) {
        console.log('⚠️ WARNING: Page seems to be showing mobile app development instead of web development!');
        console.log('🔄 Attempting to correct the search...');
        
        // Try multiple approaches to get to web development
        const searchAttempts = [
          'web development services',
          'web development companies',
          'website development',
          'web application development',
          'custom web development'
        ];
        
        for (const attempt of searchAttempts) {
          console.log(`🔄 Trying search term: "${attempt}"`);
          
          // Go back to homepage
          await this.driver.get('https://www.goodfirms.co/');
          await this.driver.sleep(2000);
          
          const searchInput = await this.driver.findElement(By.css(selectors.search.keywordInput));
          await searchInput.clear();
          await searchInput.click();
          await this.driver.sleep(300);
          
          await this.human.typeHuman(searchInput, attempt);
          console.log(`✅ Entered keyword: "${attempt}"`);
          
          await this.driver.sleep(1000);
          await searchInput.sendKeys(Key.ENTER);
          await this.driver.sleep(3000);
          
                     // Check if this attempt worked
           const newPageSource = await this.driver.getPageSource();
           const attemptUrl = await this.driver.getCurrentUrl();
           const attemptTitle = await this.driver.getTitle();
          
                     const isCorrectCategory = (
             newPageSource.toLowerCase().includes('web development') ||
             newPageSource.toLowerCase().includes('website development') ||
             attemptUrl.includes('/web-development') ||
             attemptTitle.toLowerCase().includes('web development')
           );
          
          if (isCorrectCategory) {
            console.log(`✅ Success! Found web development results with term: "${attempt}"`);
            break;
          } else {
            console.log(`❌ Still on wrong category with term: "${attempt}"`);
          }
        }
      }

      // Iterate pages
      for (let page = 1; page <= PAGES_TO_SCRAPE; page++) {
        console.log(`📄 Processing page ${page} of ${PAGES_TO_SCRAPE}`);
        
        // Find all result items
        let resultItems = [];
        resultItems = await this.driver.findElements(By.css(selectors.results.companyItems));
        console.log(`🏢 Found ${resultItems.length} companies with '${selectors.results.companyItems}'`);

        if (resultItems.length === 0) {
          resultItems = await this.driver.findElements(By.css(selectors.results.companyItemsFallback));
          console.log(`🏢 Found ${resultItems.length} companies with '${selectors.results.companyItemsFallback}'`);
        }

        if (resultItems.length === 0) {
          resultItems = await this.driver.findElements(By.css(selectors.results.companyItemsGeneric));
          console.log(`🏢 Found ${resultItems.length} companies with '${selectors.results.companyItemsGeneric}'`);
        }

        console.log(`🏢 Final result: Found ${resultItems.length} companies on page ${page}`);

        for (let item = 0; item < Math.min(ITEMS_PER_PAGE, resultItems.length); item++) {
          console.log(`🏢 Processing company ${item + 1} of ${Math.min(ITEMS_PER_PAGE, resultItems.length)}`);
          let resultItem = resultItems[item];

          // Click 'View Profile' button with fallbacks
          let viewProfileBtn;
          try {
            viewProfileBtn = await resultItem.findElement(By.css(selectors.results.viewProfileButton));
          } catch (e) {
            // Try fallback selectors
            for (const fallbackSelector of selectors.results.viewProfileButtonFallbacks) {
              try {
                viewProfileBtn = await resultItem.findElement(By.css(fallbackSelector));
                console.log(`✅ Found profile button with fallback selector: ${fallbackSelector}`);
                break;
              } catch (e2) {
                continue;
              }
            }
            if (!viewProfileBtn) {
              throw new Error('Could not find any profile button with any selector');
            }
          }
          await this.driver.executeScript('window.open(arguments[0].href, "_blank");', viewProfileBtn);
          const tabs = await this.driver.getAllWindowHandles();
          await this.driver.switchTo().window(tabs[tabs.length - 1]);
          console.log('📋 Switched to company profile tab');

          // Scrape company info
          const companyName = await this.scrapeCompanyData();

          // Scrape reviews
          await this.scrapeReviews(companyName);

          // Close profile tab and switch back
          await this.driver.close();
          await this.driver.switchTo().window(tabs[0]);
          console.log('🔙 Switched back to search results');
        }
      }
    } catch (error) {
      console.error(`❌ Error processing "${keyword}" in "${location}":`, error.message);
    }
  }
}

module.exports = GoodFirmsScraper; 