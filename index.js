const async = require('async'),
      request = require('request'),
      url = require('url');

const DEFAULT_PROXY_EXPOSE_ENDPOINT = 'proxy';
// const requestProxy = require('express-request-proxy');
const requestProxy = require('express-http-proxy');

const BrestEndpointProxy = {
  name: 'endpoint-proxy',
  init: function(brest, callback){
    async.waterfall([
      (next) => {
        if (!brest.getSetting('proxy.expose')) return next();
        const expose_endpoint = require('./endpoint')(brest);
        expose_endpoint.noun = brest.getSetting('proxy.expose.endpoint', DEFAULT_PROXY_EXPOSE_ENDPOINT);
        brest.bind(expose_endpoint, next);
      }
    ], callback);
  }
};

function _proxyHandler(req, callback) {
  callback({proxy: 'If you are getting this reply, endpoint proxy middleware is broken'}); // You are not supposed to get here
}

function requestEndpoint(endpoint_name, settings, callback) {
  if (!settings.url) throw "Missing endpoint proxy URL";
  request({
    url: settings.url + settings.prefix + '/' + (settings.endpoint || DEFAULT_PROXY_EXPOSE_ENDPOINT) + '/' + endpoint_name,
    headers: {'x-brest-proxy-key': settings.key}
  }, (err, res, body) => {
      if (err) return callback(err);
      const resource = JSON.parse(body);
      if (resource.endpoints) {
        resource.endpoints = resource.endpoints.map(endpoint => {
          endpoint.handler = _proxyHandler;
          const proxied_url = settings.url + settings.prefix + '/' + endpoint_name + '/' + (endpoint.uri ? endpoint.uri : '');
          const proxy_middle = requestProxy(settings.url, {
            proxyReqPathResolver: function (req) {
              const url_parts = url.parse(req.url, true);
              const path = settings.prefix + '/' + endpoint_name + (endpoint.uri ? '/' + endpoint.uri : '');
              return Object.keys(req.params).reduce((str, param) => str.replace(`:${param}`, req.params[param]), path) + url_parts.search;
            }
          });
          endpoint.middle = [proxy_middle];
          return endpoint;
        });
      } else {
        console.warn(`WARNING: no endpoints in resource ${endpoint_name}`);
      }
      callback(null, resource);
  });
}

module.exports = BrestEndpointProxy;
module.exports.requestEndpoint = requestEndpoint;