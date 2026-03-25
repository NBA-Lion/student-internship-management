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
  // Tránh lỗi: allowedHosts[0] should be a non-empty string (CRA + WDS khi lanUrlForConfig rỗng / HOST lạ)
  devServer: (config) => {
    const ah = config.allowedHosts;
    if (Array.isArray(ah)) {
      const cleaned = ah.filter((x) => typeof x === 'string' && x.trim().length > 0);
      config.allowedHosts = cleaned.length > 0 ? cleaned : 'all';
    }
    return config;
  },
};
