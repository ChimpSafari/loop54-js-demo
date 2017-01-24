/*globals $ */

import loop54 from 'loop54-js-lib';
import renderFunc from './render.js';
import utils from './utils.js';
import autocomplete from './autocomplete.js';
import filters from './filters.js';
import { Promise } from 'es6-promise';

var guiConfig = {
  inputSearch: 'input#search',
  buttonSearch: 'a#search-button',
  buttonNewUser: 'a#new-user-button',
  inputSearchText: 'Input query here..',
  filtersContainer: '.left-column',
  filterFunctions: '.filter-functions',
  filters: 'div#filters',
  pricesliderContainer: '#priceslidercontainer',
  priceslider: '#priceslider',
  pricesliderMinPriceInput: '#minPrice',
  pricesliderMaxPriceInput: '#maxPrice',
  recommendedResultsContainer: '.right-column',
  recommendedResultsList: '#recommendedresultslist',
  mainContainer: '.main-column',
  directResults: 'div#directresults',
  directResultsTotalItems: '.total-items',
  directResultsList: '#directresultslist',
  noResults: '#noresults',
  related: 'div#related',
  informationContainer: '#information',
};

var config = {},
  render;

var demo = {
  instantTimer: null,
  runningACRequests: 0,
  activeIndex: -1,
  PriceFilter: {min: null, max: null},
  previousSearch: {},
  isSearchEnabled: true,

  /*
  * handleHashChanged is triggered when the hash in the URI changes.
  * This is to make the demo work without reloading.
  */
  handleHashChanged: function(newConfig, search) {
    $('.loading-layout').hide();
    $('.error-layout').hide();
    $('.demo-layout').show();
    if(newConfig) {
      config = newConfig;
      render = renderFunc(config, guiConfig);
      autocomplete.init(config.autoCompleteQuest, config.autoCompletePageSize);
      filters.init(config.filters, guiConfig.filters, guiConfig.filterFunctions);
      render.init();
      loop54.setConfig({url: config.url});
      if(config.continousScrolling) {
        window.addEventListener('scroll', function() {
          demo.displayMore();
        }, true);
      } else {
        window.removeEventListener('scroll', function() {
          demo.displayMore();
        }, true);
      }
      if(location.hash === '') {
        utils.setHash({
          config: config.name,
        });
      }
      utils.initShoppingCart(config.name, render.shoppingCart);
    }

    if(search) {
      demo.search(search, true);
    } else {
      render.clearSearch();
    }
  },

  /*
  * Search functionality
  */
  buildSearchRequest: function(options, searchFromHashChange) {
    var req = {
      QuestName: config.searchQuest,
      QueryString: options.query,
      RelatedQueries_FromIndex: 0,
      RelatedQueries_ToIndex: 5,
      PreventReSearch: options.preventReSearch || false,
    };

    /*
    * if this search is done on page load or hash change and continousScrolling is on then it should load everything
    * from page 0 until the pagenumber in the url
    */
    if(config.directResultsPageSize > 0 && options.page > 0 && config.continousScrolling && searchFromHashChange) {
      req.DirectResults_FromIndex = 0;
      req.DirectResults_ToIndex = (options.page + 1) * config.directResultsPageSize - 1;
    } else if(config.directResultsPageSize > 0) {
      // this is the normal direct results search
      req.DirectResults_FromIndex = config.directResultsPageSize * options.page;
      req.DirectResults_ToIndex = (options.page + 1) * config.directResultsPageSize - 1;
    }

    if(config.recommendedResultsPageSize > 0 && options.page > 0 && config.continousScrolling && searchFromHashChange) {
      req.RecommendedResults_FromIndex = 0;
      req.RecommendedResults_ToIndex = (options.page + 1) * config.recommendedResultsPageSize - 1;
    } else if(config.recommendedResultsPageSize > 0) {
      req.RecommendedResults_FromIndex = config.recommendedResultsPageSize * options.page;
      req.RecommendedResults_ToIndex = (options.page + 1) * config.recommendedResultsPageSize - 1;
    }

    for (var i = 0; i < config.filters.length; i++) {
      if(config.filters[i].type == 'numberRange') {
        for(var y = 0; y < config.filters[i].requestParameter.length; y++) {
          var filterValue = filters.get(config.filters[i].requestParameter[y]);
          if(filterValue) {
            req[config.filters[i].requestParameter[y]] = filterValue;
          }
        }
      } else {
        var filterArray = filters.get(config.filters[i].requestParameter);
        if(filterArray) {
          if(filterArray.length > 0) {
            req[config.filters[i].requestParameter] = filterArray;
          }
        }
      }
    }
    return req;
  },

  search: function(options = {}, searchFromHashChange = false) {
    var req = {},
      self = this,
      isContinuation;

    if(options.clearFilters || options.facet || searchFromHashChange) {
      filters.reset();
    }

    if(options.facet) {
      filters.add(config.autoCompleteFacetingParameter, options.facet);
    }

    if(options.clearSearch) {
      render.clearSearch();
    }

    options = {
      instant: options.instant || false,
      preventReSearch: options.preventReSearch || false,
      page: options.page || 0,
      query: options.query,
    };

    utils.setHash({
      config: config.name,
      page: options.page,
      section: 'search',
      query: options.query,
    });

    this.previousSearch = { ...options };
    isContinuation = options.page > 0 && config.continousScrolling && !searchFromHashChange;
    if(!isContinuation) {
      render.hidePopup();
      if(!options.instant) {
        autocomplete.hide();
      }
    }

    // build request that can be sent to Loop54 API
    req = this.buildSearchRequest(options, searchFromHashChange);

    // Make sure input has the search query set as value
    $(guiConfig.inputSearch).val(options.query);

    // Make request to Loop54 API using the js library
    loop54.getResponse(req).then( function(response) {
      if(!response.success) {
        console.log(response.errorMessage);
        utils.showNotification('Error: ' + response.errorMessage);
      } else {
        var data = response.data;
        self.previousSearch.totalItems = data.DirectResults_TotalItems;
        render.clearSearch(isContinuation);

        if(!data.MakesSense) {
          render.showMakesNoSense(data.DirectResults.length, data.SpellingSuggestions, options.query, self.search.bind(self));
        }

        if(data.ReSearchQueryString) {
          render.showReSearch(data.ReSearchQueryString, options.query, self.search.bind(self));
        }

        if(data.DirectResults && data.DirectResults.length > 0) {
          render.directResults(data.DirectResults, data.DirectResults_TotalItems, isContinuation, loop54);
        }

        if(data.RelatedQueries && data.RelatedQueries.length > 0) {
          render.addRelated(data.RelatedQueries, self.search.bind(self));
        }

        if(data.RecommendedResults && data.RecommendedResults.length > 0) {
          render.recommendedResults(data.RecommendedResults, isContinuation, loop54);
        } else if(options.page < 1) {
          render.noRecommendedResults();
        }

        filters.update(data, demo.searchAgain, demo);

        if(config.continousScrolling) {
          self.addDisplayMoreButton();
          self.displayMore();
        } else if(data.DirectResults_TotalItems > config.directResultsPageSize) {
          self.updatePaging(data.DirectResults_TotalItems, options.page, self.previousSearch, self.search.bind(self));
        }
      }
    });
  },

  searchAgain: function(clearSearch = true) {
    demo.search({...demo.previousSearch, clearSearch: clearSearch, page: 0});
  },

  /*
  * Extra functions needed for the demo
  */

  setVersionNumber: function() {
    var version = '__VERSION__';
    $('#version-number').html('Loop54-demo v' + version);
  },

  handleUpdateViewError: function(errorMessage, errorCode) {
    $('.loading-layout').hide();
    $('demo-layout').hide();
    $('.error-layout').show();
    $('.error-message').text(errorMessage);
  },

  updatePaging: function(totalItems, page, prevSearch, searchCallback) {
    function showPage(p) {
      if(p < 2)
        return 'show';
      if(p > pages - 3)
        return 'show';
      if(p > page - 2 && p < page + 2)
        return 'show';
      if(p == 2)
        return 'dots';
      if(p == pages - 3 && page != 0 && page != pages-1)
        return 'dots';
      return 'hide';
    }
    var pages = Math.ceil(totalItems / config.directResultsPageSize);
    var pagesDiv = $('<div/>').addClass('pages').appendTo($(guiConfig.directResultsList));
    var i = 0;
    for ( i; i < pages; i++) {
      var show = showPage(i);
      if(show == 'show') {
        $('<a/>', {href: '#'}).html((i + 1)).data('page', i).addClass(page==i?'selected':'').click(function(e) {
          e.preventDefault();
          searchCallback({
            ...prevSearch,
            page: $(this).data('page'),
          });
        }).appendTo(pagesDiv);
      } else if(show == 'dots') {
        $('<span>...</span>').appendTo(pagesDiv);
      }
    }
  },

  addDisplayMoreButton: function() {
    /*
    * adds a "display more" button at the bottom of direct results, this element is only visible
    * on mobile view point (conditionally set in css)
    */
    var ps = this.previousSearch;
    if(ps.totalItems > (ps.page + 1) * config.directResultsPageSize) {
      $('.display-more').remove();
      $(guiConfig.directResultsList).append($('<a/>').attr('href', '#').addClass('display-more').html('Show more'));
    }
  },

  displayMore: function(displayMoreButtonWasClicked = false) {
    /*
    * get the previous search, to get all the information that is needed to show more
    * results when you are scrolling
    */
    var ps = this.previousSearch;

    /*
    * Check if you are at the bottom of the page
    * and check if we are in mobile viewpoint by checking if ".display-more" is hidden
    * if all is true, then move on to decide if there are more pages to load or show end of page text
    */
    if(this.isBottomVisible() && $('.display-more').is(':hidden') || displayMoreButtonWasClicked) {
      if(ps.totalItems > (ps.page + 1) * config.directResultsPageSize) {
        this.search({
          query: ps.query,
          instant: false,
          preventReSearch: ps.preventReSearch,
          page: ps.page + 1,
        });
      } else if(ps.totalItems > config.directResultsPageSize && $(guiConfig.directResultsList).find('div.endofresults').length === 0) {
        $(guiConfig.directResultsList).append($('<div/>').addClass('endofresults').html('No more results'));
      }
    }
  },

  isBottomVisible: function() {
    var scroll = $(window).scrollTop();
    var windowHeight = $(window).height();
    var height = $(guiConfig.directResults).outerHeight() + $(guiConfig.directResults).offset().top;
    return (scroll + windowHeight) >= height;
  },

  resetView: function(e) {
    e.preventDefault();
    utils.setHash({
      config: config.name,
    });
    loop54.getRandomUserId();
    utils.resetShoppingCart(config.name, render.shoppingCart);
    $(guiConfig.mainContainer).removeClass('three-columns two-columns');
    $(guiConfig.directResults).hide();
    $(guiConfig.informationContainer).hide();
    $(guiConfig.related).hide();
    $(guiConfig.recommendedResultsContainer).hide();
    $(guiConfig.makesSense).hide();
    $(guiConfig.directResultsList).empty();
    $(guiConfig.spellingSuggestions).empty();
    $(guiConfig.inputSearch).val("");
    $(guiConfig.noResults).show();
    render.initFacetting();
  },

  toggleLeftColumn: function(e) {
    if($('.left-column').hasClass('opened')) {
      $('.left-column').addClass('closed').removeClass('opened');
      $('.left-column-toggle').addClass('sm-show').removeClass('sm-hide');
    } else {
      $('.left-column').show();
      $('.left-column').addClass('opened').removeClass('closed');
      $('.left-column-toggle').addClass('sm-hide').removeClass('sm-show');
    }
  },

  addRangeFilter: function(values, requestParameters) {
    /*
    * this function is used to handle the range changes of the range slider
    * for more information check filters.js
    */
    for(var i=0; i < requestParameters.length; i++) {
      filters.add(requestParameters[i], values[i], true);
    }
    demo.searchAgain(false); // trigger a new search without clearing all the content
  },
};

// init eventhandlers
$(document).ready(function() {
  function handleClickResetFilter(e) {
    e.preventDefault();
    filters.reset();
    demo.searchAgain(false);
  }

  function handlePerformSearch(event) {
    if(demo.isSearchEnabled) {
      var searchFieldValue = $(guiConfig.inputSearch).val();
      if(event.keyCode === 13 && searchFieldValue !== '' || event.type === 'click' && searchFieldValue !== '') {
        demo.isSearchEnabled = false;
        demo.search({
          query: searchFieldValue,
          clearFilters: true,
          clearSearch: true,
          preventReSearch: false,
          instant: false,
          page: 0,
        });
        $(guiConfig.inputSearch).autocomplete('close');
        demo.isSearchEnabled = true;
      }
    }
  }

  function handleDisplayMoreClicked(e) {
    e.preventDefault();
    // remove display more button when loading more (it is then added back at the bottom)
    $(e.target).remove();
    /*
    * trigger displayMore to load more results if there are any to load
    * also sending "true" in order to tell displayMore that it was a click that triggered the function
    */
    demo.displayMore(true);
  }

  function handleGridSizeChange(gridSize) {
    if(gridSize === 'big-grid') {
      localStorage.setItem('gridSize', 'big-grid')
      $(guiConfig.directResultsList).removeClass('small-grid');
      $(guiConfig.recommendedResultsList).removeClass('small-grid');
    } else {
      localStorage.setItem('gridSize', 'small-grid')
      $(guiConfig.directResultsList).addClass('small-grid');
      $(guiConfig.recommendedResultsList).addClass('small-grid');
    }
  }

  $(window).hashchange(function(e,data) {
    utils.hashChanged(data.before.replace('#', ''),data.after.replace('#', ''), config, demo.handleHashChanged, demo.handleUpdateViewError);
  });

  if(location.hash === '') {
    // set default hash if none is set already
    utils.updateView(null, '', demo.handleHashChanged, demo.handleUpdateViewError, false);
  } else {
    var currentHash = location.hash.replace('#', '');
    var configName = utils.getHashValue('config', currentHash);
    if(configName && configName !== config.name) {
      utils.updateView(configName, currentHash, demo.handleHashChanged, demo.handleUpdateViewError, false);
    } else if(configName) {
      utils.updateView(configName, currentHash, demo.handleHashChanged, demo.handleUpdateViewError, true);
    }
  }

  /*
  * Initialize autocomplete functionality
  * this implementation is using jQuery UI's autocomplete library
  */
  $(guiConfig.inputSearch).autocomplete({
    source:  function(req, res) {
      autocomplete.getResults(req, res, loop54);
    },
    minLength: 2,
    select: function(event, ui) {
      event.preventDefault();
      event.stopPropagation();
      demo.search({clearFilters: true, instant: false, clearSearch: true, query: ui.item.value, facet: ui.item.facet});
    },
    open: function(event, ui) {
      // prevent iOS from first setting focus on menu items instead of triggering click event
      $('.ui-autocomplete').off('menufocus hover mouseover mouseenter');
      $(this).removeClass('ui-corner-all').addClass('ui-corner-top');
    },
    close: function(event, ui) {
      $(this).removeClass('ui-corner-top').addClass('ui-corner-all');
    },
  })
  .autocomplete( 'instance' )._renderItem = function(ul, item) {
    var label = item.value;
    if(item.facet) {
      label = item.value + ' in ' + '<span class="facet">' + item.facet + '</span>';
    }
    return $( '<li>' ).append( '<a>' + label + '</a>' ).appendTo( ul );
  };

  /*
  * Create eventlisteners for various elements, we are using jQuery to handle all the events
  */
  $(document).on('click', '.display-more', handleDisplayMoreClicked);
  $('#resetfiltersbutton').on('click', handleClickResetFilter);
  $('#logo img').on('click', demo.resetView);
  $('.left-column-toggle').on('click', demo.toggleLeftColumn);
  $('.close-left-column').on('click', demo.toggleLeftColumn);
  $(guiConfig.buttonSearch).on('click', handlePerformSearch);
  $(guiConfig.inputSearch).on('keyup', handlePerformSearch);
  $(guiConfig.inputSearch).focus();
  $(guiConfig.buttonNewUser).click(function() {
    loop54.getRandomUserId();
    utils.resetShoppingCart(config.name, render.shoppingCart);
    utils.showNotification('You are now searching as a new user!', 2000);
  });
  $('.grid-size a').on('click', function(e) {
    e.preventDefault();
    if(e.currentTarget.className === 'big-grid') {
      handleGridSizeChange('big-grid');
    } else {
      handleGridSizeChange('small-grid');
    }
  });
  $(document).on('click', function(e) {
    if($('.shopping-cart').is(':visible')) {
      $('.shopping-cart').hide();
    }
  });
  $('.shopping-cart').on('click', function(e) {
    e.stopPropagation();
  })
  $('#cart').on('click', function(e) {
    e.stopPropagation();
    e.preventDefault();
    $('.shopping-cart').fadeToggle('fast');
  });

  demo.setVersionNumber();
  // if you have choosen a grid size for the result list already, load it and set it
  if (typeof(Storage) !== "undefined") {
    var gridSize = localStorage.getItem('gridSize');
    if(gridSize) {
      handleGridSizeChange(gridSize);
    }
  }
});
