// View-specific code
switch (window.location.pathname) {
    case '/browser-client':
        require('./graphRoutes')()
        break;
}
