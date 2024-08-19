const express = require('express');
const path = require('path');
const oracledb = require('oracledb');

const app = express();

 //Configuracion de la base de datos Oracle
const dbConfig = {
    user: 'sekunet_admin',
    password: '12345',
    connectString: 'localhost:1521/orcl'
};

//Funcion para obtener una conexion de base de datos
async function getConnection() {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        console.log('Conexion a Oracle establecida');
        return connection;
    } catch (err) {
        console.error('Error al conectar a Oracle:', err);
    }
}

//Middleware para hacer disponible la conexion a las rutas
app.use(async (req, res, next) => {
    try {
        req.db = await getConnection();
        console.log('Conexión a la base de datos establecida en middleware');
        next();
    } catch (err) {
        console.error('Error en el middleware de conexión:', err);
        res.status(500).send('Error en la conexión a la base de datos');
    }
});

app.use(express.static(path.join(__dirname, 'styles')));
app.use(express.urlencoded({ extended: true }));


app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));


//Rutas
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
});