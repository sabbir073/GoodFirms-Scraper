// Central file for all CSS/XPath selectors (configurable)

module.exports = {
  // Search page selectors
  search: {
    keywordInput: '.live-category-search',
    locationInput: '.live-location-search',
    searchButton: null, // TODO: Add if needed
  },

  // Results page selectors
  results: {
    companyItems: 'li.firm-wrapper.observed',
    companyItemsFallback: 'li.firm-wrapper',
    companyItemsGeneric: '[class*="firm"]',
    viewProfileButton: 'a.visit-profile.transBG-link.js-no-modal-overlay',
    viewProfileButtonFallbacks: [
      'a[href*="/company/"]',
      'a[href*="/profile/"]',
      'a.visit-profile',
      'a[class*="profile"]',
      'a[class*="visit"]',
      'a[href*="goodfirms.co/company"]'
    ],
    nextPageButton: null, // TODO: Add if needed
  },

  // Company profile page selectors
  company: {
    name: 'h1.profile-company-name',
    nameFallbacks: [
      'h1[class*="company"]',
      'h1',
      '[class*="company-name"]',
      '[class*="profile"] h1'
    ],
    totalReviews: '.entity-review-wrapper .review-count [itemprop="reviewCount"]',
    rating: '.entity-review-wrapper [itemprop="ratingValue"]',
    website: 'a.visit-website-btn',
    address: {
      street: '.profile-location-address [itemprop="streetAddress"]',
      locality: '.profile-location-address [itemprop="addressLocality"]',
      postalCode: '.profile-location-address [itemprop="postalCode"]',
      country: '.country-name[itemprop="addressCountry"]'
    },
    phone: '.entity-telephone[itemprop="telephone"]',
    serviceFocus: '.profile-service-focus-wrap ul.chart-legend-list li.chart-legend-item',
    industryFocus: '.profile-industry-focus-wrap ul.industries-chips li',
    clientFocus: '.profile-client-focus-wrap .client-focus-item-name'
  },

  // Reviews page selectors
  reviews: {
    container: '#reviews_list > div.profile-reviews-list.flex-column.gap-20',
    reviewItems: '#reviews_list article.profile-review',
    reviewerName: '.reviewer-name [itemprop="name"]',
    datePosted: '.review-date',
    datePublished: 'meta[itemprop="datePublished"]',
    rating: '.review-project-rating .review-rating-breakdown-list li:last-child .rating-star-container',
    nextPageButton: 'li.next-page a[rel="next"]',
    nextPageButtonFallbacks: [
      'a[title="Next Page"]',
      'a[rel="next"]',
      'li.next-page a',
      'a[href*="page="]',
      'a[data-href*="page="]',
      '.pagination a:last-child',
      '[class*="next"] a',
      '[class*="pagination"] a:last-child'
    ]
  }
}; 