// Central file for all CSS/XPath selectors (configurable)

module.exports = {
  // Search page selectors
  search: {
    keywordInput: '.live-category-search',
    locationInput: '.live-location-search',
    searchButton: 'button.banner-search-action[aria-label="Find Companies"]',
    dropdownItem: '.suggestion-item, .autocomplete-item, [class*="suggestion"], [class*="autocomplete"]',
    results: 'li.firm-wrapper.observed, .firm-wrapper, [class*="firm"], .company-item, .search-result-item',
    nextPage: 'li.next-page a[rel="next"]'
  },

  // View Profile button selector - multiple fallbacks
  viewProfileButton: 'a.visit-profile.transBG-link.js-no-modal-overlay[title*="Profile"], a.visit-profile, a[href*="/company/"], a[href*="/profile/"], .visit-profile, [class*="profile"] a, a[title*="Profile"], a[title*="View"]',

  // Company profile page selectors
  company: {
    name: 'h1.profile-company-name, h1.company-name, .company-header h1, h1, .company-title',
    totalReviews: '.entity-review-wrapper .review-count [itemprop="reviewCount"], .review-count, [class*="review"] [class*="count"]',
    rating: '.entity-review-wrapper [itemprop="ratingValue"], .rating, [class*="rating"]',
    website: 'a.visit-website-btn[target="_blank"], a.visit-website-btn, a[href*="http"], .website-link',
    address: '.profile-location-address, .address, [class*="address"]',
    phone: '.entity-telephone[itemprop="telephone"], .phone, [class*="phone"]',
    serviceFocus: '.services-chart-list li button.services-chart-tabs-btn, .profile-service-focus-wrap ul.chart-legend-list li.chart-legend-item, .service-focus, [class*="service"]',
    industryFocus: '.profile-industry-focus-wrap ul.industries-chips li, .industries-chips li, .industry-focus, [class*="industry"]',
    clientFocus: '.profile-client-focus-wrap .client-focus-item-name, .client-focus-area-wrapper .client-focus-item-name, .client-focus, [class*="client"]'
  },

  // Review selectors - using exact selectors provided by user
  reviews: {
    container: 'article.profile-review[itemprop="review"], .profile-review',
    text: '.review-summary[itemprop="description"]',
    rating: '.review-rating-breakdown-list li:last-child .rating-star-container',
    author: '.reviewer-name span[itemprop="name"]',
    datePosted: '.review-date',
    datePublished: 'meta[itemprop="datePublished"]',
    title: '.review-title[itemprop="name"]',
    projectName: '.project-info:first-child p',
    services: '.project-info:nth-child(2) p',
    projectDescription: '.project-info:nth-child(3) p',
    likedMost: '.project-info:nth-child(4) p',
    likedLeast: '.project-info:nth-child(5) p',
    projectCost: '.project-services-list li:first-child span:last-child',
    projectStatus: '.project-services-list li:nth-child(2) span:last-child',
    projectIndustry: '.project-services-list li:nth-child(3) span:last-child'
  },

  // Pagination selectors - using exact selectors provided by user
  pagination: {
    container: '.pagination-wrapper .pagination',
    nextPage: '.next-page a, .pagination .next-page a',
    lastPage: '.last-page a, .pagination .last-page a',
    currentPage: '.pagination .active'
  }
}; 