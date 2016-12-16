/* globals $ */
import utils from './utils.js';

let loader = {
  config: null,

  loadDemoConfig: function(configName, updateViewSuccessCallback, updateViewErrorCallback) {
    $.ajax({
      dataType: 'json',
      url: 'customer.json',
      success: function(data) {
        utils.showNotification('Successfully loaded ' + data.name);
        updateViewSuccessCallback(data);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log(jqXHR);
        console.log('Could not load demo config');
        utils.showNotification('Could not load demo config');
        var errorMessage = 'This demo is not available at the moment.';
        updateViewErrorCallback(errorMessage, jqXHR.status);
      },
    });
  },
};

export default loader;
