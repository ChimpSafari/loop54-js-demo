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
  showHiddenItems: {},
  list: {},

  init: function(configFilters, filtersContainer, filtersFunctions) {
    this.configFilters = configFilters;
    this.filtersContainer = filtersContainer;
    this.filtersFunctions = filtersFunctions || null;

    // add eventlistener for when the range slider is sliding, this will update the label with the current slide value
    $(document).on('change', '.slider-value', function(e){$(e.target).prev('label').text(e.target.value)});
  },

  getAll: function() {
    return this.list;
  },

  get: function(key) {
    if(this.list[key] !== undefined) {
      return this.list[key];
    } else {
      return false;
    }
  },

  update: function(res, callback, demo) {
    var numberOfItemsInVisibleContainer = 5;
    if(this.configFilters.length > 0 && this.filtersFunctions) {
      $(this.filtersFunctions).show();
    }

    /*
    * iterate through all the filters (facets) that are set in config
    * for each filter, we will add filter items and place them in a "always visible" div
    * or in a hidden div that can be expanded if you click "show all" or similar
    */
    for (var i = 0; i < this.configFilters.length; i++) {
      var filterHeader = $('#filter_header_' + this.configFilters[i].name.replace(' ','_'));
      var filterContainer = $('#filter_' + this.configFilters[i].name.replace(' ','_'));
      var dataType = this.configFilters[i].type;
      filterContainer.empty();

      /*
      * check if the filter type is numberRange or string(default)
      */
      if(dataType == 'numberRange') {
        var minValue, maxValue, selectedMinValue, selectedMaxValue, minValueParameter, maxValueParameter, currentMinValueFilter, currentMaxValueFilter;
        minValueParameter = this.configFilters[i].responseParameter[0];
        maxValueParameter = this.configFilters[i].responseParameter[1];
        currentMinValueFilter = filters.get(this.configFilters[i].requestParameter[0]);
        currentMaxValueFilter = filters.get(this.configFilters[i].requestParameter[1]);

        /*
        * set min/maxValue and selectedMin/MaxValue to the returned value
        */
        minValue = selectedMinValue = res[minValueParameter];
        maxValue = selectedMaxValue = res[maxValueParameter];

        /*
        * if there is a range set already we want to change selectedMin/MaxValue to that value instead of min/max
        */
        if(typeof(currentMinValueFilter) == 'number' && typeof(currentMaxValueFilter) == 'number') {
          selectedMinValue = currentMinValueFilter < minValue || currentMinValueFilter > maxValue ? minValue : currentMinValueFilter;
          selectedMaxValue = currentMaxValueFilter > maxValue || currentMaxValueFilter < minValue ? maxValue : currentMaxValueFilter;
        }

        /*
        * doublecheck that minValue and maxValue are present and set, so that we don't raise errors
        */
        if(typeof(minValue) == 'number' && typeof(maxValue) == 'number') {
          var name = this.configFilters[i].name.replace(' ','_'); // replace space in name so that we can use it as a selector
          var rangeSlider = $('<div />', {id: name + 'slider'}).data('filterkey', this.configFilters[i].requestParameter);
          rangeSlider.appendTo(filterContainer);

          /*
          * create the label and input elements that goes under the slider, only the label will be visible
          */
          $('<label />', {class: 'slider-label min'}).text(selectedMinValue).appendTo(filterContainer);
          $('<input />', {class: 'slider-value min'}).val(selectedMinValue).appendTo(filterContainer);
          $('<label />', {class: 'slider-label max'}).text(selectedMaxValue).appendTo(filterContainer);
          $('<input />', {class: 'slider-value max'}).val(selectedMaxValue).appendTo(filterContainer);

          /*
          * initialize the slider on the container element
          */
          $('#' + name + 'slider').slider({
            range: true,
            min: minValue,
            max: maxValue,
            values: [selectedMinValue, selectedMaxValue],
            step: 1,
            slide: function( event, ui ) {
              $(event.target).siblings('input.slider-value.min').val(ui.values[0]).trigger('change');
              $(event.target).siblings('input.slider-value.max').val(ui.values[1]).trigger('change');
            },
            stop: function( event, ui ) {
              /*
              * the only function that is outside of this file, it is used to get the reference of this file when the range is changed.
              * You can find the function in index.js
              */
              demo.addRangeFilter(ui.values, $(event.target).data('filterkey'));
            }
          });

          /*
          * if minValue and maxValue are present, show the header and container
          */
          filterHeader.show();
          filterContainer.addClass('slider-container').show();
        } else {
          filterHeader.hide();
          filterContainer.hide();
        }
      /*
      * continue if it was a string or undefined
      */
      } else {
        var data = res[this.configFilters[i].responseParameter];
        if(data && data.length > 0) {
          var selectedFilters = []; // array to put all selected filter elements in
          var notSelectedFilters = []; // array to put the rest of the filter elements in
          var selectedFiltersArray = []; // this is a placeholder for the possible list of selected filters

          if(this.list[this.configFilters[i].requestParameter]) {
            // if there is a list of selected filters, use it to find the selected ones below
            selectedFiltersArray = this.list[this.configFilters[i].requestParameter];
          }

          // create the container divs that we will use when displaying items
          var alwaysVisibleContainer = $('<div/>').addClass('alwaysvisible').appendTo(filterContainer);
          var hiddenContainer = $('<div/>').addClass('hideable').appendTo(filterContainer);

          // iterate through the list of data items (filters) that was sent with the function call
          for (var j = 0; j < data.length; j++) {

            var selected = selectedFiltersArray.indexOf(data[j].Key) > -1; // if the current item is selected, it will be in selectedFiltersArray

            // this is the actual item element
            var checkbox = '<input type="checkbox"' + (selected ? ' checked' : '') + '>';
            var filterItem = $('<a />', {href: '#'})
              .html('<span class="filter-number">(' + data[j].Value + ')</span>' + checkbox + data[j].Key)
              .data('filterkey', this.configFilters[i].requestParameter)
              .data('filtervalue', data[j].Key)
              .addClass(selected ? 'selected' : '')
              .click(function(e) {
                e.preventDefault();
                if(!$(this).hasClass('selected')) {
                  filters.add($(this).data('filterkey'), $(this).data('filtervalue'));
                  $(this).addClass('selected');
                  callback(false);
                } else {
                  filters.remove($(this).data('filterkey'), $(this).data('filtervalue'));
                  $(this).removeClass('selected');
                  callback(false);
                }
              })

            // if the item is selected, we will put it in the selectedFilters array
            if(selected) {
              selectedFilters.push(filterItem);
            } else {
              notSelectedFilters.push(filterItem);
            }
          }

          /*
          * The following if statements are to determine if items should go in the alwaysVisibleContainer
          * or if they should stay in the hiddenContainer.
          *
          * Selected items will always go in the top container (alwaysVisibleContainer) since we always want
          * them on top.
          *
          * if there is room for more items in the top container it will add notSelectedFilters until the limit is reached
          * the limit is:
          * as many selected filters as needed
          * if there are no more then 4 selected filters we will add notSelectedFilters up to maximum 5 items
          * the rest will go in the hiddenContainer and hidden by default
          */
          if(selectedFilters.length > 0) {
            alwaysVisibleContainer.append(selectedFilters);
          }

          if(selectedFilters.length < 5 && notSelectedFilters.length > 0) {
            for(var y = selectedFilters.length; y < 5; y++) {
              alwaysVisibleContainer.append(notSelectedFilters.shift());
            }
          }

          if(notSelectedFilters.length > 0) {
            hiddenContainer.append(notSelectedFilters);
          }

          /*
          * This part checks if the hiddenContainer should be shown.
          * it also creates the "show all/hide" link in the bottom of the filterContainer
          */
          if(hiddenContainer.find('a').length > 0) {
            if(this.showHiddenItems[this.configFilters[i].name]) {
              hiddenContainer.show();
            }
            $('<a/>', {href: '#'})
              .html(filters.showHiddenItems[this.configFilters[i].name]?'Hide':'Show all')
              .addClass('showhide').data('div', hiddenContainer)
              .data('filterName',this.configFilters[i].name)
              .click(function(e) {
                e.preventDefault();
                if($(this).data('div').is(':visible')) {
                  filters.showHiddenItems[$(this).data('filterName')] = false;
                  $(this).data('div').hide();
                  $(this).html('Show all');
                } else {
                  filters.showHiddenItems[$(this).data('filterName')] = true;
                  $(this).data('div').show();
                  $(this).html('Hide');
                }})
            .appendTo(filterContainer);
          }

          // last we want to show everything
          filterHeader.show();
          filterContainer.show();
        } else {
          // if the filter (facet) was not present in this search result, we will hide the filterContainer
          filterHeader.hide();
          filterContainer.hide();
        }
      }
    }
  }, // end of update function

  add: function(key, value, singleValue = false) {
    /*
    * In order to support storing a single value (used by range slider) you can specify
    * the variable "singleValue" with the function call if you want to store it as it is.
    * If you don't specify anything the value will be added to an array under the key that is
    * specified in the function call. This is the expected behavior when dealing with normal
    * facets/filters since we want to be able to select multiple facets in one category.
    */
    if(singleValue) {
      // used by range slider
      this.list[key] = value;
    } else {
      // used by normal facets
      if(!this.list[key]) {
        this.list[key] = [];
      }
      this.list[key].push(value);
    }
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
}

export default filters;
