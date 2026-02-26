/* Tắt warning "Failed to parse source map" từ antd và thư viện khác */
module.exports = {
  webpack: {
    configure: (config) => {
      config.ignoreWarnings = [
        /Failed to parse source map/,
      ];
      return config;
    },
  },
};
