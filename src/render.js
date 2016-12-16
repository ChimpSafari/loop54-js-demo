// requires jQuery to be in global scope
/* globals $ */

import utils from './utils.js';
import track from './track.js';

let render = function(config, guiConfig) {
  function showInformationBox(html, infoType) {
    $(guiConfig.informationContainer).empty().removeClass('info success warning error');
    $(guiConfig.informationContainer).addClass(infoType).html(html);
    $(guiConfig.informationContainer).show();
  }

  function replaceImageUrl(entity) {
    var ret = config.productImageUrl;

    for (var i = 0; i < config.productImageUrlAttributes.length; i++) {
      var attr = config.productImageUrlAttributes[i];

      var attrValue = '';

      if(attr == 'ExternalId') {
        attrValue = entity.ExternalId;
      } else if(entity.Attributes[config.productImageUrlAttributes[i]]) {
        attrValue = entity.Attributes[config.productImageUrlAttributes[i]][0];
      }

      // Replace doesn't like "$&" in the image url...
      ret = ret.split('$' + (i + 1)).join(attrValue);
    }

    return ret;
  }

  function getEntityTitle(entity) {
    if(entity.Attributes[config.productTitleAttribute]) {
      return entity.Attributes[config.productTitleAttribute][0];
    }

    return '';
  }

  function getEntityPrice(entity) {
    if(entity.Attributes['Price']) {
      return entity.Attributes['Price'][0];
    }

    return '';
  }

  function getEntityDescription(entity) {
    if(entity.Attributes[config.productDescriptionAttribute]) {
      return entity.Attributes[config.productDescriptionAttribute][0];
    }

    return '';
  }

  return {
    init: function() {
      track.init(config);
      this.initFacetting();
    },

    initFacetting: function() {
      $(guiConfig.pricesliderContainer).hide();
      $(guiConfig.filterFunctions).hide();
      $(guiConfig.filters).empty();

      for (var i = 0; i < config.filters.length; i++) {
        $(guiConfig.filters)
        .append($('<h6/>').attr('id', 'filter_header_' + config.filters[i].name.replace(' ','_')).html(config.filters[i].name).addClass('filterdiv-header'))
        .append($('<div/>').attr('id', 'filter_' + config.filters[i].name.replace(' ','_')).addClass('filterdiv'));
      }
    },

    showMakesNoSense: function(directResultsLength, spellingSuggestions, query, searchCallback) {
      var infoType = 'error';
      var informationHeader = $('<div />')
        .addClass('information-header')
        .html('We did not understand the query "<b>' + query + '</b>". ');
      var informationContent = '';

      if(directResultsLength > 0) {
        infoType = 'warning';
        informationHeader.append($('<span>The results below are approximate.</span>'));
      }

      if(spellingSuggestions && spellingSuggestions.length > 0) {
        infoType = 'warning';
        informationContent = $('<div />')
          .addClass('information-content')
          .html('Did you mean to search for: ');
        var informationContentList = $('<span />').addClass('information-list');

        function onClick(e) {
          e.preventDefault();
          searchCallback({query: $(this).data('query'), clearFilters: true});
        }

        for (var i = 0; i < spellingSuggestions.length; i++) {
          informationContentList.append($('<a />', {href: '#'})
            .html(spellingSuggestions[i].Key)
            .data('query', spellingSuggestions[i].Key)
            .click(onClick)
          );
        }

        informationContent.append(informationContentList);
      }

      var makesNoSenseHTML = $('<div />')
        .append(informationHeader)
        .append(informationContent);
      showInformationBox(makesNoSenseHTML, infoType);
    },

    showReSearch: function(reSearchString, originalQuery, searchCallback) {
      function onClick(e) {
        e.preventDefault();
        searchCallback({
          query: $(this).data('query'),
          clearFilters: true,
          instant: false,
          preventReSearch: true,
        });
      }

      var informationHeader = $('<div />')
        .addClass('information-header')
        .html('We assumed you meant "<b>' + reSearchString + '</b>".')
      var informationContent = $('<div />')
        .addClass('information-content')
        .html('Search instead for ')
        .append($('<a />', {href: '#'})
          .html(originalQuery).click(onClick)
        );
      showInformationBox(informationHeader, 'warning')
    },

    addRelated: function(related, searchCallback) {
      function onClick(e) {
        e.preventDefault();
        searchCallback({
          query: $(this).data('query'),
          clearFilters: true,
          instant: false,
          preventReSearch: false,
        });
      }

      var relatedList = $('<span />').addClass('related-list');

      for (var i = 0; i < related.length; i++) {
        relatedList.append($('<a />', {href: '#'})
          .html(related[i].Key)
          .data('query', related[i].Key)
          .click(onClick)
        );
      }

      $(guiConfig.related).empty()
        .append($('<span/>').addClass('related-header').html('Related'))
        .append(relatedList);
      $(guiConfig.related).show();
    },

    directResults: function(directResults, totalItems, isContinuation, loop54) {
      if(!isContinuation) {
        $(guiConfig.directResultsTotalItems).text(totalItems);
      }

      if(totalItems > 0) {
        $(guiConfig.noResults).hide();
        $(guiConfig.directResults).show();
      } else {
        $(guiConfig.directResults).hide();
        $(guiConfig.noResults).show();
      }

      for (var i = 0; i < directResults.length; i++) {
        this.renderEntity(guiConfig.directResultsList, directResults[i].Key, directResults[i].Value, loop54);
      }
    },

    recommendedResults: function(recommendedResults, isContinuation, loop54) {
      if($(guiConfig.recommendedResultsContainer).not(':visible') && !isContinuation || $(guiConfig.recommendedResultsContainer).is(':visible') && isContinuation) {
        $(guiConfig.recommendedResultsContainer).show();
        $('.demo-content')
          .removeClass('two-columns')
          .addClass('three-columns');

        for (var i = 0; i < recommendedResults.length; i++) {
          this.renderEntity(guiConfig.recommendedResultsList, recommendedResults[i].Key, recommendedResults[i].Value, loop54, 'mdl-cell--12-col');
        }
      }
    },

    noRecommendedResults: function() {
      $(guiConfig.recommendedResultsContainer).hide();
      $('.demo-content')
        .removeClass('three-columns')
        .addClass('two-columns');
    },

    clearSearch: function(keepResults) {
      if(!keepResults) {
        $(guiConfig.mainContainer).removeClass('three-columns two-columns');
        $(guiConfig.directResults).hide();
        $(guiConfig.recommendedResultsContainer).hide();
        $(guiConfig.noResults).show();
        $(guiConfig.directResultsList).empty();
        $(guiConfig.recommendedResultsList).empty();
      }
      $(guiConfig.informationContainer).hide();
      $(guiConfig.related).hide();
    },

    hidePopup: function() {
      $('div#popupbg').hide();
      $('div.entitypopup').remove();
    },

    renderEntity: function(element, entity, value, loop54, extraClass) {
      var imgUrl = replaceImageUrl(entity),
        entityTitle = getEntityTitle(entity),
        entityPrice = getEntityPrice(entity),
        customClass = '';
      var self = this;

      if(imgUrl == '') {
        var randomNumber = Math.floor(Math.random() * 5) + 1;
        customClass = ' placeholder-image';
        imgUrl = '/images/placeholder-'+randomNumber+'.png';
      }

      var div = $('<div/>')
      .addClass('entity')
      .addClass(extraClass)
      .addClass('demo-card-square mdl-card mdl-shadow--2dp')

      if(config.showValues) {
        div.attr('title', value);
      }

      var emptyDiv = $('<div/>')
      .addClass('mdl-card__title mdl-card--expand' + customClass)
      .css({'background-image': 'url(\'' + imgUrl + '\')'})
      .data('entity', entity)
      .data('value', value)
      .click(function () {
        self.showEntity($(this).data('entity'), $(this).data('value'), loop54);
      })
      .appendTo(div);

      var title = $('<div/>')
      .addClass('mdl-card__supporting-text')
      .html(entityTitle)
      .data('entity', entity)
      .data('value', value)
      .click(function () {
        self.showEntity($(this).data('entity'), $(this).data('value'), loop54);
      })
      .appendTo(div);

      var actionsDiv = $('<div/>')
      .addClass('mdl-card__actions mdl-card--border')
      .appendTo(div);

      if(entityPrice !== '') {
        var price = $('<span/>')
        .html(Math.ceil(entityPrice) + '.-')
        .appendTo(actionsDiv)
      }

      var icon = $('<i/>')
      .addClass('material-icons')
      .html('shopping_cart')
      .click(function () {
        track.event(entity, 'purchase', loop54, self.shoppingCart);
      })
      .appendTo(actionsDiv)

      div.appendTo($(element));
    },

    showEntity: function(entity, value, loop54) {
      var self = this;
      track.event(entity, 'click', loop54);

      function closePopup(e) {
        e.preventDefault();
        $('div#popupbg').hide();
        $('div.entitypopup').remove();
      }

      function handlePurchaseEvent(e) {
        e.preventDefault();
        track.event(entity, 'purchase', loop54, self.shoppingCart);
      }

      // show the grey background and remove the old popup container
      $('div#popupbg').show();
      $('div.entitypopup').remove();

      // create a new popup container
      var entityPopup = $('<div/>').addClass('entitypopup').appendTo($('body')).css('top', $(window).scrollTop() + 100);

      // set up listeners for closing the popup
      $('<a />', {href: '#'}).addClass('close').html('x').click(closePopup).appendTo(entityPopup);
      $('div#popupbg').click(closePopup);
      $(window).on('keydown', function (e) {
        if(e.which === 27 && $('div#popupbg').is(':visible')) { closePopup(e); }
      });

      // create image container
      var imgUrl = replaceImageUrl(entity);
      if(imgUrl == '') {
        var randomNumber = Math.floor(Math.random() * 5) + 1;
        imgUrl = '/images/placeholder-'+randomNumber+'.png';
      }
      var imageContainer = $('<div />').addClass('popup-image-container');
      var image = $('<img />').attr('src', imgUrl);
      $('<a />').attr({'href': imgUrl, 'target': '_blank'}).html(image).appendTo(imageContainer);
      imageContainer.appendTo(entityPopup);

      // create information container
      var informationContainer = $('<div />').addClass('popup-information-container');

      // entity title field
      $('<h2 />').addClass('popup-title-field').html(getEntityTitle(entity)).appendTo(informationContainer);

      var functionsContainer = $('<div />').addClass('popup-functions-container');
      // price tag (if present)
      var entityPrice = getEntityPrice(entity);
      if(entityPrice !== '') {
        $('<span />').addClass('popup-price-field').html(Math.ceil(entityPrice) + '.-').appendTo(functionsContainer);
      }

      // purchase button
      $('<a />', {href: '#'})
        .addClass('popup-purchase-button')
        .html('Purchase <i class="material-icons">shopping_cart</i>').click(handlePurchaseEvent).appendTo(functionsContainer);

      functionsContainer.appendTo(informationContainer);

      // entity description field
      $('<div />').addClass('popup-description-field').html('<div class="popup-description-title">Description</div>' + getEntityDescription(entity)).appendTo(informationContainer);

      informationContainer.appendTo(entityPopup);

      // extra info (hidden by default)
      $('<a />', {href: '#'}).html('Show all attributes').addClass('popup-extra-info-showhide').appendTo(entityPopup).click(function (e) {
        e.preventDefault();
        $('.popup-extra-information').toggle();
        var text = $('.popup-extra-info-showhide').text();
        $('.popup-extra-info-showhide').text(text == 'Show all attributes' ? 'Hide all attributes' : 'Show all attributes');
      });

      var extraInfoContainer = $('<div />').addClass('popup-extra-information').appendTo(entityPopup);
      var extraInfoTopContainer = $('<div />').addClass('popup-extra-info-top');

      $('<p />').addClass('popup-extra-info-row').html('<span class="popup-extra-info-label">EntityType</span><p>' + entity.EntityType + '</p>').appendTo(extraInfoTopContainer);
      $('<p />').addClass('popup-extra-info-row').html('<span class="popup-extra-info-label">ExternalId</span><p>' + entity.ExternalId + '</p>').appendTo(extraInfoTopContainer);
      $('<p />').addClass('popup-extra-info-row').html('<span class="popup-extra-info-label">Value</span><p>' + value + '</p>').appendTo(extraInfoTopContainer);
      extraInfoTopContainer.appendTo(extraInfoContainer);

      for (var key in entity.Attributes) {
        $('<p />').addClass('popup-extra-info-row').html('<span class="popup-extra-info-label">' + key + '</span><p>' + entity.Attributes[key] + '</p>').appendTo(extraInfoContainer);
      }
    },

    shoppingCart: function(items, totalAmount) {
      $('.shopping-cart-total-items').each(function(i, item) {
        item.innerText = totalAmount;
      });

      var shoppingCartItems = $('.shopping-cart-items');
      shoppingCartItems.empty();
      $(items).each(function(i, item){
        var li = $('<li/>')
        .addClass('clearfix');

        if(item.image == '') {
          var randomNumber = Math.floor(Math.random() * 5) + 1;
          var image = '/images/placeholder-'+randomNumber+'.png';
        }

        $('<img/>')
        .attr('src', item.image || image)
        .appendTo(li);

        $('<span/>')
        .addClass('item-name')
        .html('<span class="item-name">'+item.name+'</span>')
        .appendTo(li);

        if(item.price != null) {
          $('<span/>')
          .addClass('item-price')
          .html('<span class="item-price">'+Math.ceil(item.price)+'.-</span>')
          .appendTo(li);
        };

        $('<span/>')
        .addClass('item-quantity')
        .html('<span class="item-quantity">Quantity: '+item.amount+'</span>')
        .appendTo(li);

        li.appendTo(shoppingCartItems);
      });

      if(shoppingCartItems.find('li').length < 1) {
        var li = $('<li/>')
        .addClass('clearfix')
        .html('No purchases yet!')
        .appendTo(shoppingCartItems)
      }
    },
  };
};

export default render;
