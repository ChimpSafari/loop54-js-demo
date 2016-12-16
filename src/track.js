/*
* This file includes all logic for tracking events when using Loop54.
* You can find more information about Events in our docs:
* https://www.loop54.com/docs/product-search-event-tracking
*
* Feel free to change this file to fit your needs.
*/
import utils from './utils.js';

let track = {
  config: {},

  init: function(config) {
    this.config = config;
  },

  event: function(entity, eventType, loop54, renderShoppingCart) {
    /*
    * utils and render is included to make the demo application work,
    * if you just want to use this file without the demo application you can
    * safely remove these and the related code below.
    */
    var req = {
      Events: [{
        Type: eventType,
        Entity: {
          EntityType: entity.EntityType,
          ExternalId: entity.ExternalId,
        },
      }],
      QuestName: this.config.createEventsQuest,
    };

    loop54.getResponse(req).then( function(response) {
      if(!response.success) {
        console.log(response.errorMessage);
        utils.showNotification('Error: ' + response.errorMessage);
      } else {
        if(eventType == 'purchase') {
          var name, price, image;
          if(entity.Attributes[track.config.productTitleAttribute]) {
            name = entity.Attributes[track.config.productTitleAttribute][0];
          } else {
            name = '';
          }
          if(entity.Attributes['Price']) {
            price = entity.Attributes['Price'][0];
          } else {
            price = null;
          }
          image = track.config.productImageUrl;

          for (var i = 0; i < track.config.productImageUrlAttributes.length; i++) {
            var attr = track.config.productImageUrlAttributes[i];
            var attrValue = '';
            if(attr == 'ExternalId') {
              attrValue = entity.ExternalId;
            } else if(entity.Attributes[track.config.productImageUrlAttributes[i]]) {
              attrValue = entity.Attributes[track.config.productImageUrlAttributes[i]][0];
            }
            image = image.split('$' + (i + 1)).join(attrValue);
          }

          utils.showNotification('Purchased "' + name + '"', 1000);
          utils.updateShoppingCart({id: entity.ExternalId, name: name, price: price, image: image, amount: 1}, renderShoppingCart);
        }
      }
    });
  }
}

export default track;
