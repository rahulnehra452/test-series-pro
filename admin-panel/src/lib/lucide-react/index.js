const mockComponent = () => null; module.exports = new Proxy({}, { get: function() { return mockComponent; } });
