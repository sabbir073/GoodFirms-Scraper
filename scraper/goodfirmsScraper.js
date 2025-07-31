const HumanBehavior = require('./humanBehavior');
const selectors = require('./selectors');
const { writeCompanyRow, writeReviewRow } = require('../sheets/writer');

const ITEMS_PER_PAGE = parseInt(process.env.MAX_ITEMS_PER_PAGE) || 5;
const PAGES_TO_SCRAPE = parseInt(process.env.MAX_PAGES) || 2;

class GoodFirmsScraper {
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.human = new HumanBehavior(page);
  }

  async scrapeCompanyData() {
    // Company ID - extract from URL
    let companyId = '';
    try {
      const currentUrl = this.page.url();
      // Handle both /company/ and /companies/ patterns
      const urlMatch = currentUrl.match(/\/(?:company|companies)\/([^\/\?]+)/);
      if (urlMatch) {
        companyId = urlMatch[1];
        console.log(`🏢 Company ID extracted: ${companyId}`);
      } else {
        console.log(`⚠️ Could not extract company ID from URL: ${currentUrl}`);
      }
    } catch (e) {
      console.log(`❌ Failed to extract company ID: ${e.message}`);
    }

    // Company Name
    let companyName = '';
    try {
      // Try multiple selectors for company name
      const nameSelectors = [
        selectors.company.name,
        'h1.company-name',
        '.company-header h1',
        'h1',
        '.company-title'
      ];
      
      for (const selector of nameSelectors) {
        try {
          const nameElement = await this.page.$(selector);
          if (nameElement) {
            companyName = await this.page.evaluate(el => el.textContent.trim(), nameElement);
            if (companyName && companyName.length > 0) {
              console.log(`✅ Company name found with selector ${selector}: ${companyName}`);
            break;
            }
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      // If still no name, try to extract from URL
      if (!companyName || companyName.length === 0) {
        const currentUrl = this.page.url();
        const urlMatch = currentUrl.match(/\/(?:company|companies)\/([^\/\?]+)/);
        if (urlMatch) {
          companyName = urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          console.log(`✅ Company name extracted from URL: ${companyName}`);
        }
      }
      
      // Last resort: try page title
      if (!companyName || companyName.length === 0) {
        const title = await this.page.title();
        if (title && !title.includes('GoodFirms') && !title.includes('Top 100')) {
          companyName = title.replace(/\s*-\s*GoodFirms.*$/, '').trim();
          console.log(`✅ Company name extracted from title: ${companyName}`);
        }
      }
      
      if (!companyName || companyName.length === 0) {
        console.log('❌ Could not extract company name');
        return { companyName: 'Unknown', companyId, wasWritten: false };
      }
    } catch (e) {
      console.log(`❌ Error extracting company name: ${e.message}`);
      return { companyName: 'Unknown', companyId, wasWritten: false };
    }

    // Total Reviews
    let totalReviews = '';
    try {
      const reviewsElement = await this.page.$(selectors.company.totalReviews);
      if (reviewsElement) {
        totalReviews = await this.page.evaluate(el => el.textContent.trim(), reviewsElement);
        console.log(`📊 Total reviews: ${totalReviews}`);
      }
    } catch (e) {
      console.log(`❌ Error extracting total reviews: ${e.message}`);
    }

    // Rating
    let rating = '';
    try {
      const ratingElement = await this.page.$(selectors.company.rating);
      if (ratingElement) {
        rating = await this.page.evaluate(el => el.textContent.trim(), ratingElement);
        console.log(`⭐ Rating: ${rating}`);
      }
    } catch (e) {
      console.log(`❌ Error extracting rating: ${e.message}`);
    }

    // Website
    let website = '';
    try {
      const websiteElement = await this.page.$(selectors.company.website);
      if (websiteElement) {
        const fullUrl = await this.page.evaluate(el => el.href, websiteElement);
        // Extract just the domain name from the URL
        const urlMatch = fullUrl.match(/https?:\/\/([^\/\?]+)/);
        if (urlMatch) {
          website = urlMatch[1];
        } else {
          website = fullUrl;
        }
        console.log(`🌐 Website: ${website}`);
      }
    } catch (e) {
      console.log(`❌ Error extracting website: ${e.message}`);
    }

    // Address
    let address = '';
    try {
      const addressElement = await this.page.$(selectors.company.address);
      if (addressElement) {
        address = await this.page.evaluate(el => el.textContent.trim(), addressElement);
        console.log(`📍 Address: ${address}`);
      }
    } catch (e) {
      console.log(`❌ Error extracting address: ${e.message}`);
    }

    // Phone
    let phone = '';
    try {
      const phoneElement = await this.page.$(selectors.company.phone);
      if (phoneElement) {
        phone = await this.page.evaluate(el => el.textContent.trim(), phoneElement);
        console.log(`📞 Phone: ${phone}`);
      }
    } catch (e) {
      console.log(`❌ Error extracting phone: ${e.message}`);
    }

    // Service Focus
    let serviceFocus = '';
    try {
      console.log(`🔍 Using service focus selector: ${selectors.company.serviceFocus}`);
      const serviceElements = await this.page.$$(selectors.company.serviceFocus);
      console.log(`🔍 Found ${serviceElements.length} service focus elements`);
      if (serviceElements.length > 0) {
        const serviceList = await this.page.evaluate(elements => 
          elements.map(el => el.getAttribute('data-name') || el.textContent.trim()).join(', '), serviceElements);
        serviceFocus = serviceList;
        console.log(`🔧 Service Focus: ${serviceFocus}`);
      } else {
        console.log('⚠️ No service focus elements found');
      }
    } catch (e) {
      console.log(`❌ Error extracting service focus: ${e.message}`);
    }

    // Industry Focus
    let industryFocus = '';
    try {
      console.log(`🔍 Using industry focus selector: ${selectors.company.industryFocus}`);
      const industryElements = await this.page.$$(selectors.company.industryFocus);
      console.log(`🔍 Found ${industryElements.length} industry focus elements`);
      if (industryElements.length > 0) {
        const industryList = await this.page.evaluate(elements => 
          elements.map(el => el.textContent.trim()).join(', '), industryElements);
        industryFocus = industryList;
        console.log(`🏭 Industry Focus: ${industryFocus}`);
      } else {
        console.log('⚠️ No industry focus elements found');
      }
    } catch (e) {
      console.log(`❌ Error extracting industry focus: ${e.message}`);
    }

    // Client Focus
    let clientFocus = '';
    try {
      console.log(`🔍 Using client focus selector: ${selectors.company.clientFocus}`);
      const clientElements = await this.page.$$(selectors.company.clientFocus);
      console.log(`🔍 Found ${clientElements.length} client focus elements`);
      if (clientElements.length > 0) {
        const clientList = await this.page.evaluate(elements => 
          elements.map(el => el.textContent.trim()).join(', '), clientElements);
        clientFocus = clientList;
        console.log(`👥 Client Focus: ${clientFocus}`);
      } else {
        console.log('⚠️ No client focus elements found');
      }
    } catch (e) {
      console.log(`❌ Error extracting client focus: ${e.message}`);
    }

    // Write company row
    const writeResult = await writeCompanyRow({
      companyId, companyName, totalReviews, rating, website, address, phone, serviceFocus, industryFocus, clientFocus
    });

    return { companyName, companyId, wasWritten: writeResult };
  }

  async scrapeReviews() {
    try {
      console.log('📝 Starting to scrape reviews...');
      
      const allReviews = [];
      let currentPage = 1;
      const maxPages = 10; // Safety limit to prevent infinite loops
      
      while (currentPage <= maxPages) {
        console.log(`📄 Scraping reviews page ${currentPage}...`);
        
        // Wait for reviews to load
        try {
          await this.page.waitForSelector(selectors.reviews.container, { timeout: 10000 });
        } catch (e) {
          console.log('⚠️ No reviews found on this page');
          break;
        }
        
        const reviews = await this.page.$$(selectors.reviews.container);
        console.log(`📝 Found ${reviews.length} reviews on page ${currentPage}`);

        if (reviews.length === 0) {
          console.log('⚠️ No reviews found on this page, stopping pagination');
          break;
        }

        // Extract reviews from current page
        for (let i = 0; i < reviews.length; i++) {
          try {
            const review = reviews[i];
            
            // Extract review text
            let reviewText = '';
            try {
              const textElement = await review.$(selectors.reviews.text);
              if (textElement) {
                reviewText = await textElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract review text for review ${i + 1}:`, e.message);
            }

            // Extract reviewer name
            let reviewerName = '';
            try {
              const authorElement = await review.$(selectors.reviews.author);
              if (authorElement) {
                reviewerName = await authorElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract reviewer name for review ${i + 1}:`, e.message);
            }

            // Extract review date posted
            let reviewDatePosted = '';
            try {
              const datePostedElement = await review.$(selectors.reviews.datePosted);
              if (datePostedElement) {
                reviewDatePosted = await datePostedElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract review date posted for review ${i + 1}:`, e.message);
            }

            // Extract review date published
            let reviewDatePublished = '';
            try {
              const datePublishedElement = await review.$(selectors.reviews.datePublished);
              if (datePublishedElement) {
                reviewDatePublished = await datePublishedElement.evaluate(el => el.getAttribute('content'));
              }
            } catch (e) {
              console.log(`⚠️ Could not extract review date published for review ${i + 1}:`, e.message);
            }

            // Extract review title
            let reviewTitle = '';
            try {
              const titleElement = await review.$(selectors.reviews.title);
              if (titleElement) {
                reviewTitle = await titleElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract review title for review ${i + 1}:`, e.message);
            }

            // Extract rating (overall rating from the last item in the breakdown)
            let rating = '';
            try {
              const ratingElement = await review.$(selectors.reviews.rating);
              if (ratingElement) {
                const style = await ratingElement.evaluate(el => el.style.width);
                if (style) {
                  // Convert percentage to rating (e.g., "100%" = 5.0, "80%" = 4.0)
                  const percentage = parseInt(style.replace('%', ''));
                  rating = (percentage / 20).toFixed(1); // 100% = 5 stars, 80% = 4 stars, etc.
                }
              }
            } catch (e) {
              console.log(`⚠️ Could not extract rating for review ${i + 1}:`, e.message);
            }

            // Extract project details
            let projectName = '';
            try {
              const projectNameElement = await review.$(selectors.reviews.projectName);
              if (projectNameElement) {
                projectName = await projectNameElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract project name for review ${i + 1}:`, e.message);
            }

            let services = '';
            try {
              const servicesElement = await review.$(selectors.reviews.services);
              if (servicesElement) {
                services = await servicesElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract services for review ${i + 1}:`, e.message);
            }

            let projectDescription = '';
            try {
              const projectDescElement = await review.$(selectors.reviews.projectDescription);
              if (projectDescElement) {
                projectDescription = await projectDescElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract project description for review ${i + 1}:`, e.message);
            }

            let likedMost = '';
            try {
              const likedMostElement = await review.$(selectors.reviews.likedMost);
              if (likedMostElement) {
                likedMost = await likedMostElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract liked most for review ${i + 1}:`, e.message);
            }

            let likedLeast = '';
            try {
              const likedLeastElement = await review.$(selectors.reviews.likedLeast);
              if (likedLeastElement) {
                likedLeast = await likedLeastElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract liked least for review ${i + 1}:`, e.message);
            }

            let projectCost = '';
            try {
              const projectCostElement = await review.$(selectors.reviews.projectCost);
              if (projectCostElement) {
                projectCost = await projectCostElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract project cost for review ${i + 1}:`, e.message);
            }

            let projectStatus = '';
            try {
              const projectStatusElement = await review.$(selectors.reviews.projectStatus);
              if (projectStatusElement) {
                projectStatus = await projectStatusElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract project status for review ${i + 1}:`, e.message);
            }

            let projectIndustry = '';
            try {
              const projectIndustryElement = await review.$(selectors.reviews.projectIndustry);
              if (projectIndustryElement) {
                projectIndustry = await projectIndustryElement.evaluate(el => el.textContent.trim());
              }
            } catch (e) {
              console.log(`⚠️ Could not extract project industry for review ${i + 1}:`, e.message);
            }

            // Only add review if we have at least some data
            if (reviewText || reviewerName || reviewTitle) {
              allReviews.push({
                text: reviewText,
                author: reviewerName,
                datePosted: reviewDatePosted,
                datePublished: reviewDatePublished,
                title: reviewTitle,
                rating: rating,
                projectName: projectName,
                services: services,
                projectDescription: projectDescription,
                likedMost: likedMost,
                likedLeast: likedLeast,
                projectCost: projectCost,
                projectStatus: projectStatus,
                projectIndustry: projectIndustry
              });
              
              console.log(`✅ Extracted review ${i + 1} on page ${currentPage}: ${reviewerName || 'Unknown'} - ${reviewTitle || 'No title'}`);
            }

          } catch (e) {
            console.log(`❌ Error extracting review ${i + 1} on page ${currentPage}:`, e.message);
          }
        }

        // Check if there's a next page
        const nextPageButton = await this.page.$(selectors.pagination.nextPage);
        if (nextPageButton) {
          console.log(`➡️ Found next page button, clicking to page ${currentPage + 1}...`);
          await nextPageButton.click();
          await this.page.waitForTimeout(2000); // Wait for page to load
          currentPage++;
        } else {
          console.log('🏁 No next page found, stopping pagination');
          break;
        }
      }

      console.log(`📝 Successfully extracted ${allReviews.length} total reviews across ${currentPage - 1} pages`);
      return allReviews;

    } catch (e) {
      console.log('❌ Error scraping reviews:', e.message);
      return [];
    }
  }

  async searchAndScrape(keyword, location) {
    try {
      console.log(`🔍 Starting search for: ${keyword} in ${location}`);
      
      // Step 1: Go to GoodFirms homepage
      console.log('🏠 Navigating to GoodFirms homepage...');
      await this.page.goto('https://www.goodfirms.co/', { waitUntil: 'networkidle2' });
      await this.human.randomSleep();
      
      // Step 2: Find and click the keyword search input
      console.log('🔤 Looking for keyword search input...');
      await this.page.waitForSelector(selectors.search.keywordInput, { timeout: 10000 });
      
      // Click on the search input to focus it
      await this.human.clickHuman(selectors.search.keywordInput);
      await this.human.sleep(500, 1000);
      
      // Step 3: Type the keyword with human-like behavior
      console.log(`⌨️ Typing keyword: ${keyword}`);
      await this.human.typeHuman(selectors.search.keywordInput, keyword);
      await this.human.sleep(1000, 2000);
      
      // Step 4: Wait for dropdown and select the matching option
      console.log('📋 Waiting for dropdown suggestions...');
      await this.human.sleep(1000, 2000);
      
      // Try to find and click on a matching dropdown item
      try {
        const dropdownItems = await this.page.$$(selectors.search.dropdownItem);
        console.log(`📋 Found ${dropdownItems.length} dropdown items`);
        
        let selected = false;
        for (const item of dropdownItems) {
          const itemText = await this.page.evaluate(el => el.textContent.trim(), item);
          console.log(`📋 Dropdown item: "${itemText}"`);
          
          // Check if this item matches our keyword (case-insensitive)
          if (itemText.toLowerCase().includes(keyword.toLowerCase())) {
            console.log(`✅ Found matching dropdown item: "${itemText}"`);
            await item.click();
            selected = true;
            break;
          }
        }
        
        if (!selected) {
          console.log('⚠️ No exact match found in dropdown, continuing with typed text');
        }
      } catch (e) {
        console.log('⚠️ Could not find dropdown items, continuing with typed text');
      }
      
      await this.human.sleep(1000, 2000);
      
      // Step 5: Find and click the location search input
      console.log('📍 Looking for location search input...');
      await this.page.waitForSelector(selectors.search.locationInput, { timeout: 10000 });
      
      // Click on the location input to focus it
      await this.human.clickHuman(selectors.search.locationInput);
      await this.human.sleep(500, 1000);
      
      // Step 6: Type the location
      console.log(`⌨️ Typing location: ${location}`);
      await this.human.typeHuman(selectors.search.locationInput, location);
      await this.human.sleep(1000, 2000);
      
      // Step 7: Submit the search using the "Find Companies" button
      console.log('🔍 Submitting search...');
      
      // Click the "Find Companies" button
      console.log('🔘 Looking for "Find Companies" button...');
      try {
        const searchButton = await this.page.$(selectors.search.searchButton);
        if (searchButton) {
          console.log('🔘 Found "Find Companies" button, clicking it...');
          await searchButton.click();
          await this.page.waitForTimeout(3000);
          let currentUrl = this.page.url();
          console.log(`🔗 Current URL after button click: ${currentUrl}`);
          
          // Check if we're on a search results page
          if (currentUrl.includes('/companies/') || currentUrl.includes('/search') || currentUrl.includes('keyword=')) {
            console.log('✅ Successfully navigated to search results page');
          } else {
            console.log('⚠️ Button click did not navigate to expected search results page');
          }
        } else {
          console.log('⚠️ "Find Companies" button not found');
        }
      } catch (e) {
        console.log('⚠️ Error clicking "Find Companies" button:', e.message);
      }
      
      // Step 8: Start scraping the results
      console.log('📄 Starting to scrape search results...');
      
      // Debug: Check what page we're on and what elements are available
      const pageTitle = await this.page.title();
      console.log(`📄 Page title: ${pageTitle}`);
      const currentUrl = this.page.url();
      console.log(`🔗 Current URL: ${currentUrl}`);
      
      // Try to find any company-related elements on the page
      const possibleSelectors = [
        'li.firm-wrapper.observed',
        '.firm-wrapper',
        '[class*="firm"]',
        '.company-item',
        '.search-result-item',
        '.company-card',
        '[class*="company"]',
        '[class*="result"]'
      ];
      
      let foundElements = 0;
      for (const selector of possibleSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
            foundElements += elements.length;
          }
        } catch (e) {
          // Selector not found, continue
        }
      }
      
      if (foundElements === 0) {
        console.log('⚠️ No company elements found on current page');
      }
      
      for (let pageNum = 1; pageNum <= PAGES_TO_SCRAPE; pageNum++) {
        console.log(`📄 Processing page ${pageNum}`);
        
        // Wait for search results to load with multiple selector attempts
        let resultsFound = false;
        for (const selector of possibleSelectors) {
          try {
            await this.page.waitForSelector(selector, { timeout: 5000 });
            console.log(`✅ Found results with selector: ${selector}`);
            resultsFound = true;
            break;
          } catch (e) {
            // Try next selector
          }
        }
        
        if (!resultsFound) {
          console.log('⚠️ Could not find search results, checking if we need to handle Cloudflare...');
          // Check if we're on a Cloudflare page
          const pageTitle = await this.page.title();
          if (pageTitle.includes('Just a moment') || pageTitle.includes('Checking')) {
            console.log('🛡️ Cloudflare detected, waiting for manual verification...');
            console.log('🔍 PLEASE COMPLETE ANY CAPTCHA OR VERIFICATION NOW!');
            await this.human.sleep(15000, 20000); // Wait 15-20 seconds for manual verification
          }
          
          // Try waiting for results again
          for (const selector of possibleSelectors) {
            try {
              await this.page.waitForSelector(selector, { timeout: 10000 });
              console.log(`✅ Found results after Cloudflare with selector: ${selector}`);
              resultsFound = true;
            break;
            } catch (e) {
              // Try next selector
            }
          }
        }
        
        if (!resultsFound) {
          console.log('❌ Could not find any search results on this page');
          break;
        }
        
        // Get all company cards using the first working selector
        let companyCards = [];
        for (const selector of possibleSelectors) {
          try {
            companyCards = await this.page.$$(selector);
            if (companyCards.length > 0) {
              console.log(`🏢 Found ${companyCards.length} companies with selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }
        
        if (companyCards.length === 0) {
          console.log('❌ No company cards found, stopping pagination');
          break;
        }

        for (let i = 0; i < Math.min(companyCards.length, ITEMS_PER_PAGE); i++) {
          try {
            console.log(`🏢 Processing company ${i + 1}/${Math.min(companyCards.length, ITEMS_PER_PAGE)}`);
            
            // Get the current company card
            const currentCard = companyCards[i];
            
            if (!currentCard) {
              console.log(`⚠️ Company card ${i + 1} not found, skipping...`);
              continue;
            }

            // Look specifically for the "View Profile" link
            console.log('🔍 Looking for "View Profile" link...');
            
            // Try multiple selectors for the View Profile link
            const viewProfileSelectors = [
              'a.visit-profile.transBG-link.js-no-modal-overlay[title*="Profile"]',
              'a.visit-profile',
              'a[href*="/company/"]',
              'a[href*="/profile/"]',
              '.visit-profile',
              '[class*="profile"] a',
              'a[title*="Profile"]',
              'a[title*="View"]',
              'a[href*="goodfirms.co/company"]',
              'a'
            ];
            
            let viewProfileLink = null;
            let usedSelector = '';
            
            for (const selector of viewProfileSelectors) {
              try {
                viewProfileLink = await currentCard.$(selector);
                if (viewProfileLink) {
                  // Verify it's actually a company profile link
                  const href = await this.page.evaluate(el => el.href, viewProfileLink);
                  if (href && (href.includes('/company/') || href.includes('/profile/'))) {
                    usedSelector = selector;
                    console.log(`✅ Found "View Profile" link with selector: ${selector}`);
                    console.log(`🔗 Link href: ${href}`);
                    break;
                  }
                }
              } catch (e) {
                // Try next selector
              }
            }
            
            if (!viewProfileLink) {
              console.log(`⚠️ "View Profile" link not found for company ${i + 1}, trying to find any clickable link...`);
              
              // Try to find any link within the card
              const allLinks = await currentCard.$$('a');
              console.log(`🔍 Found ${allLinks.length} links in company card ${i + 1}`);
              
              for (let j = 0; j < allLinks.length; j++) {
                try {
                  const link = allLinks[j];
                  const href = await this.page.evaluate(el => el.href, link);
                  const text = await this.page.evaluate(el => el.textContent.trim(), link);
                  
                  console.log(`🔗 Link ${j + 1}: "${text}" -> ${href}`);
                  
                  if (href && (href.includes('/company/') || href.includes('/profile/') || text.toLowerCase().includes('profile') || text.toLowerCase().includes('view'))) {
                    viewProfileLink = link;
                    usedSelector = `link ${j + 1}`;
                    console.log(`✅ Using link: "${text}" -> ${href}`);
                    break;
                  }
                } catch (e) {
                  // Try next link
                }
              }
            }
            
            if (!viewProfileLink) {
              console.log(`⚠️ No suitable "View Profile" link found for company ${i + 1}, skipping...`);
              continue;
            }

            // Get the href before clicking to verify it's a company profile link
            const href = await this.page.evaluate(el => el.href, viewProfileLink);
            console.log(`🔗 View Profile link: ${href}`);
            
            if (!href || !(href.includes('/company/') || href.includes('/profile/'))) {
              console.log(`⚠️ Link doesn't point to a company profile: ${href}`);
              continue;
            }

            // Store the original page
            const originalPage = this.page;
            const originalPageCount = (await this.browser.pages()).length;
            
            console.log('🖱️ Clicking "View Profile" link to open new tab...');
            
            // Click the "View Profile" link to open new tab
            await viewProfileLink.click();
            
            // Wait for new tab to open
            await this.page.waitForTimeout(3000);
            
            // Get all pages and switch to the new one
            const pages = await this.browser.pages();
            const newPageCount = pages.length;
            
            if (newPageCount > originalPageCount) {
              // New tab was opened, switch to it
              this.page = pages[newPageCount - 1];
              console.log('✅ Switched to new tab');
            } else {
              console.log('⚠️ No new tab opened, using current page');
            }

            // Wait for page to load
            await this.page.waitForTimeout(3000);
            
            // Verify we're on a company profile page
            const currentUrl = this.page.url();
            console.log(`🔗 Current URL: ${currentUrl}`);
            
            if (!currentUrl.includes('/company/')) {
              console.log('⚠️ Not on a company profile page, skipping...');
              // Close tab if it was opened and go back to original
              if (this.page !== originalPage) {
                await this.page.close();
                this.page = originalPage;
              }
              continue;
            }
            
            console.log('📋 Starting to extract company data...');
            
            // Scrape company data
            const { companyName, companyId, wasWritten } = await this.scrapeCompanyData();
            
            // Only scrape reviews if company was successfully written (not a duplicate)
            if (wasWritten) {
              console.log('📝 Scraping reviews...');
              const reviews = await this.scrapeReviews();
              for (const review of reviews) {
                await writeReviewRow({
                  companyName: await this.page.title(),
                  author: review.author,
                  rating: review.rating,
                  datePosted: review.datePosted
                });
              }
            } else {
              console.log(`⏭️ Skipping reviews for duplicate company: ${companyName}`);
            }

            // Close the current tab and switch back to original
            if (this.page !== originalPage) {
              console.log('🔒 Closing tab and switching back to search results...');
              await this.page.close();
              this.page = originalPage;
              console.log('✅ Back to search results page');
            }

            await this.human.randomSleep();
            
          } catch (e) {
            console.log(`❌ Error processing company ${i + 1}: ${e.message}`);
            
            // Try to get back to the search results page
            try {
              const pages = await this.browser.pages();
              if (pages.length > 1) {
                // Close current tab and switch to first tab
                await this.page.close();
                this.page = pages[0];
                console.log('✅ Recovered to search results page');
              }
            } catch (recoveryError) {
              console.log(`❌ Error recovering from company processing error: ${recoveryError.message}`);
            }
          }
        }

        // Go to next page if not on last page
        if (pageNum < PAGES_TO_SCRAPE) {
          try {
            const nextButton = await this.page.$(selectors.search.nextPage);
            if (nextButton) {
              await nextButton.click();
              await this.page.waitForTimeout(3000);
              await this.human.randomSleep();
            } else {
              console.log('⚠️ No next page button found, stopping pagination');
              break;
            }
          } catch (e) {
            console.log(`❌ Error navigating to next page: ${e.message}`);
            break;
          }
        }
      }
      
      console.log(`🎉 SCRAPING COMPLETED SUCCESSFULLY!`);
      console.log(`✅ Finished scraping for: ${keyword} in ${location}`);
      console.log(`📊 Data has been saved to Google Sheets`);
      console.log(`🔗 Check your output sheet for company data and reviews sheet for review data`);
      
    } catch (error) {
      console.error(`❌ Error in searchAndScrape: ${error.message}`);
      throw error;
    }
  }
}

module.exports = GoodFirmsScraper; 