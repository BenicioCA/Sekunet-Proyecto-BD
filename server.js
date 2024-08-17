const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'styles')));

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    console.log('Updated')
    res.render('index')
});

app.get('/routers', (req, res) => {
    res.render('routers');
});

app.get('/switches', (req, res) => {
    res.render('switches');
});

app.get('/productos-domotica', (req, res) => {
    res.render('productos-domotica');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/crear-cuenta', (req, res) => {
    res.render('crear-cuenta');
});

app.get('/recuperar-password', (req, res) => {
    res.render('recuperar-password');
});

app.get('/perfil', (req, res) => {
    res.render('perfil');
})

app.get('/metodo-pago', (req, res) => {
    res.render('metodo-pago');
});

app.get('/sucursales', (req, res) => {
    res.render('sucursales');
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
})