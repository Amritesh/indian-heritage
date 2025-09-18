const webpack = require('webpack');

module.exports = {
  webpack: {
    plugins: [
      new webpack.DefinePlugin({
        'process.env.REACT_APP_API_BASE_URL': JSON.stringify('http://localhost:5000')
      })
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