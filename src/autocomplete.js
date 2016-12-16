/*
* This file includes all logic for getting autocomplete to work for
* Loop54 searching. In the demo we use jQuery UI autocomplete library
* and in order to use this file right of the shelf you will need to use
* jQuery UI as well.
*
* More info can be found in our docs: https://www.loop54.com/docs/product-search-autocomplete
*
* Feel free to change this file to fit your needs.
*/
import utils from './utils.js';

let autocomplete = {
  container: null,
  autocompleteCache: {},
  autoCompleteQueries: [],
  fetchingAutoComplete: false,
  autoCompleteQuest: null,
  autoCompletePageSize: 0,

  init: function(autoCompleteQuest, autoCompletePageSize, autocompleteContainer) {
    /*
    * call init after you have required autocomplete.js
    * autoCompleteQuest and autoCompletePageSize are part of the configuration file
    * that you have recieved from us, or from the example configuration that is
    * included in this demo from start.
    * autocompleteContainer is optional to include when initiating autocomplete.
    */
    this.autoCompleteQuest = autoCompleteQuest;
    this.autoCompletePageSize = autoCompletePageSize;
    this.container = autocompleteContainer || $('#autocomplete');
  },

  buildRequest: function(options) {
    var req = {
      QuestName: autocomplete.autoCompleteQuest,
      QueryString: options.query,
    };
    if(autocomplete.autoCompletePageSize > 0) {
      req.autoComplete_FromIndex = 0;
      req.autoComplete_ToIndex = autocomplete.autoCompletePageSize;
    }
    return (req);
  },

  processResponse: function(response, callback) {
    if(!response.success) {
      console.log(response.errorMessage);
      utils.showNotification('Error: ' + response.errorMessage);
    } else {
      var data = response.data;
      if(data.AutoComplete.length > 0) {
        callback(this.formatData(data));
      } else {
        callback([]);
      }
    }
  },

  formatData: function(data) {
    var ret, facets;
    ret = data.AutoComplete.map( (x) => {
      return {
        value: x.Key,
        label: x.Key,
      };
    });

    facets = data.AutoCompleteFacets.map( x => {
      return {
        label: data.AutoCompleteFacetingString,
        value: data.AutoCompleteFacetingString,
        facet: x.Key,
      };
    });

    ret.unshift(...facets);
    return ret;
  },

  hide: function() {
    $(autocomplete.container).hide();
  },

  getResults: function(req, res, loop54) {
    var req,
        cache = this.autocompleteCache;

    if(cache[req.term]) {
      this.processResponse(cache[req.term], res);
    }
    req = this.buildRequest({query: req.term});
    loop54.getResponse(req).then(function(response) {
      cache[req.term] = response;
      autocomplete.processResponse(response, res);
    });
  },
}

export default autocomplete;
