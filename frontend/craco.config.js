const webpack = require('webpack');

module.exports = {
  webpack: {
    plugins: [
    ]
  },
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
};