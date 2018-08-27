import React from 'react';
import ReactDOM from 'react-dom';
(function () {
    let injectTapEventPlugin = require('react-tap-event-plugin');
    let Main = require('./components/main.jsx');

    window.React = React;
    injectTapEventPlugin();
    ReactDOM.render(<Main />, document.getElementById('container'), function() {});
})();
