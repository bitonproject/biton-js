module.exports = {
    addGraphRoutes: function (app) {
        app.get('/*', (req, res) => {
            res.render('index')
        })
    }
}
