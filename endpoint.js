const HTTP_UNAUTHORIZED = 401;

module.exports = function(brest) {
  return {
    endpoints: [{
      method: 'GET',
      uri: ':endpoint',
      handler: function(req, callback) {
        if (req.headers['x-brest-proxy-key'] !== brest.getSetting('proxy.key')) return callback({error: 'Incorrect proxy key', code: HTTP_UNAUTHORIZED});
        if (!req.params.endpoint) return callback({error: 'Missing endpoint name'});
        const endpoint_name = req.params.endpoint;
        if (!brest.resources[endpoint_name]) return callback({error: `Endpoint ${endpoint_name} is missing on current server`});
        const resource = brest.resources[endpoint_name];
        const description = {
          version: resource.version || 1,
          endpoints: []
        };
        resource.endpoints.forEach((endpoint) => {
          const endpoint_description = {
              method: endpoint.$fields.method,
              uri: endpoint.$fields.uri
          };
          description.endpoints.push(endpoint_description)
        });
        callback(null, description);
      }
    }]
  }
};