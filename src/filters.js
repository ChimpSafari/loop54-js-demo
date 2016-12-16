/*
* This file includes all logic for filters (faceting) when using Loop54.
* You can find more information about Faceting in our docs:
* https://www.loop54.com/docs/faceted-search-navigation
*
* Feel free to change this file to fit your needs.
*/

let filters = {
  filtersFunctions: null,
  filtersContainer: null,
  configFilters: [],
  visibleFilters: {},
  list: {},

  init: function(configFilters, filtersContainer, filtersFunctions) {
    this.configFilters = configFilters;
    this.filtersContainer = filtersContainer;
    this.filtersFunctions = filtersFunctions || null;
  },

  getAll: function() {
    return this.list;
  },

  get: function(key) {
    if(this.list[key]) {
      return this.list[key];
    } else {
      return false;
    }
  },

  update: function(res, callback) {
    if(this.configFilters.length > 0 && this.filtersFunctions) {
      $(this.filtersFunctions).show();
    }

    for (var i = 0; i < this.configFilters.length; i++) {
      var filterHeader = $('#filter_header_' + this.configFilters[i].name.replace(' ','_'));
      var filterDiv = $('#filter_' + this.configFilters[i].name.replace(' ','_'));
      var data = res[this.configFilters[i].responseParameter];
      filterDiv.empty();

      if(data && data.length > 0) {
        filterHeader.show();
        filterDiv.show();
        var filterArray = [];
        if(this.list[this.configFilters[i].requestParameter]) {
          filterArray = this.list[this.configFilters[i].requestParameter];
        }
        var div = $('<div/>').addClass('alwaysvisible').appendTo(filterDiv);
        for (var j = 0; j < data.length; j++) {
          if(j == 5) {
            div = $('<div/>').addClass('hideable').appendTo(filterDiv);
            if(this.visibleFilters[this.configFilters[i].name]) {
              div.show();
            }
            $('<a/>', {href: '#'})
              .html(filters.visibleFilters[this.configFilters[i].name]?'Hide':'Show all')
              .addClass('showhide').data('div', div)
              .data('filterName',this.configFilters[i].name)
              .click(function(e) {
                e.preventDefault();
                if($(this).data('div').is(':visible')) {
                  filters.visibleFilters[$(this).data('filterName')] = false;
                  $(this).data('div').hide();
                  $(this).html('Show all');
                } else {
                  filters.visibleFilters[$(this).data('filterName')] = true;
                  $(this).data('div').show();
                  $(this).html('Hide');
                }
              }).appendTo(filterDiv);
          }

          div.append(
            $('<a/>', {href: '#'})
            .html(data[j].Key + ' (' + data[j].Value + ')')
            .data('filterkey', this.configFilters[i].requestParameter)
            .data('filtervalue', data[j].Key)
            .addClass(filterArray.indexOf(data[j].Key) > -1 ? 'selected' : '')
            .click(function(e) {
              e.preventDefault();
              if(!$(this).hasClass('selected')) {
                filters.add($(this).data('filterkey'), $(this).data('filtervalue'));
                $(this).addClass('selected');
                callback();
              } else {
                filters.remove($(this).data('filterkey'), $(this).data('filtervalue'));
                $(this).removeClass('selected');
                callback();
              }
            })
          );
        }
      } else {
        filterHeader.hide();
        filterDiv.hide();
      }
    }
  },

  add: function(key, value) {
    if(!this.list[key]) {
      this.list[key] = [];
    }
    this.list[key].push(value);
  },

  remove: function(key, value) {
    var param = this.list[key];
    if(!param) {
      return;
    }
    var index = param.indexOf(value);
    if(index > -1) {
      param.splice(index, 1);
    }
  },

  reset: function() {
    this.list = {};
  },

  updatePriceFilterValues: function(minPrice, maxPrice) {
    $(guiConfig.pricesliderMinPriceInput).val(minPrice).trigger('change');
    $(guiConfig.pricesliderMaxPriceInput).val(maxPrice).trigger('change');
  },
}

export default filters;
