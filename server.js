
var host = '192.168.1.28';
var port = 5001;
var express = require('express');
var path = require('path');

var app = express();
app.use(express.static(path.join(__dirname, '/bin')));

app.listen(port, host);
console.log('server running at host:port : ' + host + ':' + port);
