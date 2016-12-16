/* globals location */
'use strict';
import loader from './loader.js';

let utils = {
  initShoppingCart: function(customerName, renderShoppingCartCallback) {
    if(!localStorage.cart) {
      utils.setShoppingCart({items: [], total: 0, customer: customerName})
    } else {
      var cart = utils.getShoppingCart();
      if(cart.customer == customerName) {
        renderShoppingCartCallback(cart.items, cart.total);
      } else {
        utils.setShoppingCart({items: [], total: 0, customer: customerName})
        renderShoppingCartCallback([], 0);
      }
    }
  },

  updateShoppingCart: function(entity, renderShoppingCartCallback) {
    var cart = utils.getShoppingCart();
    var itemIndex = null;
    for(var i = 0; i < cart.items.length; i++) {
      if(cart.items[i].id == entity.id) {
        itemIndex = i;
      }
    };

    if(itemIndex !== null) {
      cart.items[itemIndex].amount += entity.amount;
    } else {
      cart.items.push(entity);
    }

    cart.total = cart.total + entity.amount;
    utils.setShoppingCart(cart);
    renderShoppingCartCallback(cart.items, cart.total);
    // var shoppingCartValue = document.querySelector('.shopping-cart-value');
    // shoppingCartValue.innerText = newValue;
  },

  getShoppingCart: function() {
    return JSON.parse(localStorage.cart);
  },

  setShoppingCart: function(item) {
    localStorage.cart = JSON.stringify(item);
  },

  resetShoppingCart: function(customerName, renderShoppingCartCallback) {
    utils.setShoppingCart({items: [], total: 0, customer: customerName})
    renderShoppingCartCallback([], 0);
  },

  showNotification: function(message, timeout = 5000) {
    var notification = document.querySelector('.mdl-js-snackbar');
    var data = {
      message: message,
      timeout: timeout
    };
    if(notification.MaterialSnackbar) {
      notification.MaterialSnackbar.showSnackbar(data);
    }
  },

  buildURI: function(newHash) {
    var returnHash = '#';
    $.each(newHash, function(key, value) {
      if(returnHash !== '#') {
        returnHash = returnHash + '&';
      }
      returnHash = returnHash + key + '=' + value;
    });
    return returnHash;
  },

  getHashValue: function(name, hash) {
    if(!hash) {
      hash = decodeURI(location.hash.replace('#', ''));
    } else {
      hash = decodeURI(hash);
    }

    var split = hash.split('&');
    for(var i = 0; i < split.length; i++)
    {
      var pair = split[i].split('=');

      if(pair[0] === name) {
        return pair[1];
      }
    }
    return null;
  },

  justSetHash: null,

  setHash: function(newHash) {
    var newHash = utils.buildURI(newHash);
    utils.justSetHash = newHash.replace('#', '');
    location.hash = newHash;
  },

  updateView: function(configName, currentHash, callback, errorCallback, onlyPerformSearch) {
    var updateViewSuccessCallback = function(config) {
      if(config) {
        var section = utils.getHashValue('section', currentHash);
        var page = parseInt(utils.getHashValue('page', currentHash));
        var searchQuery = utils.getHashValue('query', currentHash);
        if(searchQuery && searchQuery !== '') {
          if(onlyPerformSearch) {
            config = null;
          }
          callback(config, {
            query: searchQuery,
            clearFilters: true,
            clearSearch: true,
            instant: false,
            preventReSearch: false,
            page: page || 0,
          });
        } else {
          callback(config, '');
        }
      }
    };

    var updateViewErrorCallback = function(errorMessage, errorCode) {
      errorCallback(errorMessage, errorCode);
    };
    loader.loadDemoConfig(configName, updateViewSuccessCallback, updateViewErrorCallback);
  },



  hashChanged: function(previousHash, currentHash, config, callback, errorCallback) {
    if(currentHash && currentHash != previousHash) {
      var hashChangedSuccessCallback = function(newConfig) {
        var section = utils.getHashValue('section', currentHash);
        var page = parseInt(utils.getHashValue('page', currentHash));

        if(newConfig) {
          callback(newConfig);
        } else if(section === 'search') {

          var searchQuery = utils.getHashValue('query', currentHash);
          var oldQuery = utils.getHashValue('query', previousHash);
          if(searchQuery != oldQuery && searchQuery !== '') {

            callback(null, {
              query: searchQuery,
              clearFilters: true,
              clearSearch: true,
              instant: false,
              preventReSearch: false,
              page: page || 0,
            });
          }
        }
      };

      var hashChangedErrorCallback = function(errorMessage, errorCode) {
        errorCallback(errorMessage, errorCode);
      };

      //make sure we dont do anything if the hash was set by code, not the user
      if(currentHash !== utils.justSetHash) {
        var configName = utils.getHashValue('config', currentHash);
        //no demo config loaded or new config does not match
        if(config === null || configName !== config.name) {
					console.log("hashchanged");
          loader.loadDemoConfig(configName, hashChangedSuccessCallback, hashChangedErrorCallback);
        }
        else {
          hashChangedSuccessCallback();
        }
      }
    }
  },
};

export default utils;
