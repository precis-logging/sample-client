var Hapi = require('hapi');
var request = require('request');
var fs = require('fs');
var path = require('path');
var Boom = require('boom');

var Logger = require('precis-client-logger').Logger;
var ConsoleAdapter = require('precis-console-adapter').ConsoleAdapter;
var FileAdapter = require('precis-file-adapter').FileAdapter;
var HTTPCapture = require('precis-client-logger').HTTPCapture;
var HAPICapture = require('precis-client-logger').HAPI8Capture;

var logger = new Logger({
  adapters: [ConsoleAdapter, FileAdapter]
});

// Capture all outbound HTTP and HTTPS activities
HTTPCapture(require('http'), logger);
HTTPCapture(require('https'), logger);

var PORT = 8080;

var started = function(){
  logger.info('Server started on port http://localhost:'+PORT);
};

var server = new Hapi.Server();
server.connection({port: PORT});

// Capture all Hapi activities
HAPICapture(server, {logger: logger});

var servePage = function(pages, reply){
  var page = Array.isArray(pages)?pages.join('/'):(pages||'index.html').toString();
  var fileName = path.resolve(__dirname, './site/', page);
  fs.stat(fileName, function(err, data){
    if(err){
      return reply(Boom.wrap(err, 400));
    }
    reply.file(fileName);
  });
};

// Setup some basic routes
server.route([
  /*
    Typical way to do this in Hapi, just doing it the hard way for this
    sample so the "normal" page route is the same as the "slow" route.
  {
    method: 'GET',
    path: '/{param*}',
    handler: {
        directory: {
            path: 'site'
        }
    }
  },*/
  {
    method: 'GET',
    path: '/{page*}',
    handler: function(req, reply){
      servePage(req.params.page, reply);
    }
  },
  {
    method: 'GET',
    path: '/slow/{page*}',
    handler: function(req, reply){
      setTimeout(function(){
        servePage(req.params.page, reply);
      }, 800);
    }
  },
  /*
    "Slowed" proxy call to google
  */
  {
    method: 'GET',
    path: '/google',
    handler: function(req, reply){
      setTimeout(function(){
        request(
          'https://www.google.com',
          function(err, res, body){
            reply(body);
          });
      }, 800);
    }
  },
]);

server.start(started);
